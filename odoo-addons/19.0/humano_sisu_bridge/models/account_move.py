from odoo import fields, models


class AccountMove(models.Model):
    _inherit = 'account.move'

    sisu_journal_entry_id = fields.Char(
        string='SISU Journal Entry ID',
        index=True,
        copy=False,
        help='UUID of journal_entries in Humano SISU. Unique per company.',
    )

    _sql_constraints = [
        (
            'sisu_journal_entry_id_company_uniq',
            'unique(company_id, sisu_journal_entry_id)',
            'SISU journal entry id must be unique per company.',
        ),
    ]
