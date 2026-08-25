from odoo import Command, api, models
from odoo.exceptions import UserError


class HumanoSisuBridge(models.TransientModel):
    _name = 'humano.sisu.bridge'
    _description = 'Humano SISU integration methods'

    def _company(self, vals):
        company_id = vals.get('company_id')
        if company_id:
            company = self.env['res.company'].browse(int(company_id))
            if not company.exists():
                raise UserError('Odoo company_id not found.')
            return company
        return self.env.company

    @api.model
    def upsert_employee(self, vals):
        if not isinstance(vals, dict):
            raise UserError('vals must be an object.')
        sisu_id = vals.get('sisu_id')
        name = vals.get('name')
        if not sisu_id or not name:
            raise UserError('sisu_id and name are required.')

        company = self._company(vals)
        Employee = (
            self.env['hr.employee']
            .with_company(company)
            .with_context(active_test=False)
        )
        employee = Employee.search(
            [
                ('sisu_employee_id', '=', sisu_id),
                ('company_id', '=', company.id),
            ],
            limit=1,
        )
        payload = {
            'name': name,
            'sisu_employee_id': sisu_id,
            'company_id': company.id,
            'active': bool(vals.get('active', True)),
        }
        if 'work_email' in vals:
            payload['work_email'] = vals.get('work_email') or False
        if 'identification_id' in vals:
            payload['identification_id'] = vals.get('identification_id') or False

        if employee:
            employee.write(payload)
        else:
            employee = Employee.create(payload)

        partner = employee.work_contact_id
        return {
            'odoo_id': employee.id,
            'partner_id': partner.id if partner else False,
        }

    @api.model
    def import_payroll_move(self, vals):
        if not isinstance(vals, dict):
            raise UserError('vals must be an object.')
        sisu_id = vals.get('sisu_journal_entry_id')
        lines = vals.get('lines') or []
        journal_code = vals.get('journal_code')
        if not sisu_id:
            raise UserError('sisu_journal_entry_id is required.')
        if not journal_code:
            raise UserError('journal_code is required.')
        if not lines:
            raise UserError('lines are required.')

        company = self._company(vals)
        Move = self.env['account.move'].with_company(company)
        existing = Move.search(
            [
                ('sisu_journal_entry_id', '=', sisu_id),
                ('company_id', '=', company.id),
            ],
            limit=1,
        )
        if existing:
            return {'odoo_move_id': existing.id, 'state': existing.state}

        journal = self.env['account.journal'].with_company(company).search(
            [('code', '=', journal_code), ('company_id', '=', company.id)],
            limit=1,
        )
        if not journal:
            raise UserError('Journal code %s not found.' % journal_code)
        if journal.type != 'general':
            raise UserError(
                'Journal %s must be miscellaneous (type general), not %s.'
                % (journal_code, journal.type)
            )

        currency_name = vals.get('currency') or 'HNL'
        currency = self.env['res.currency'].search([('name', '=', currency_name)], limit=1)
        if not currency:
            raise UserError('Currency %s not found.' % currency_name)

        Account = self.env['account.account'].with_company(company)
        command_lines = []
        debit_total = 0.0
        credit_total = 0.0
        for line in lines:
            code = line.get('account_code')
            if not code:
                raise UserError('Each line requires account_code.')
            account = Account.search(
                [('code', '=', code), ('company_id', '=', company.id)],
                limit=1,
            )
            if not account:
                raise UserError('Account code %s not found.' % code)
            debit = float(line.get('debit') or 0)
            credit = float(line.get('credit') or 0)
            if debit < 0 or credit < 0 or (debit > 0 and credit > 0):
                raise UserError('Invalid debit/credit on account %s.' % code)
            if debit == 0 and credit == 0:
                raise UserError('Line for account %s has zero amounts.' % code)
            debit_total += debit
            credit_total += credit
            command_lines.append(
                Command.create(
                    {
                        'account_id': account.id,
                        'name': line.get('name') or vals.get('ref') or 'SISU payroll',
                        'debit': debit,
                        'credit': credit,
                    }
                )
            )

        if round(debit_total, 2) != round(credit_total, 2):
            raise UserError(
                'Unbalanced entry: debit %s credit %s.' % (debit_total, credit_total)
            )

        move = Move.create(
            {
                'move_type': 'entry',
                'journal_id': journal.id,
                'company_id': company.id,
                'date': vals.get('date'),
                'ref': vals.get('ref') or sisu_id,
                'currency_id': currency.id,
                'sisu_journal_entry_id': sisu_id,
                'line_ids': command_lines,
            }
        )
        return {'odoo_move_id': move.id, 'state': move.state}
