from odoo import fields, models


class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    sisu_employee_id = fields.Char(
        string='SISU Employee ID',
        index=True,
        copy=False,
        help='UUID of the employee in Humano SISU. Unique per company.',
    )

    _sql_constraints = [
        (
            'sisu_employee_id_company_uniq',
            'unique(company_id, sisu_employee_id)',
            'SISU employee id must be unique per company.',
        ),
    ]
