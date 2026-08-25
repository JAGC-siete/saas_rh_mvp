# -*- coding: utf-8 -*-
{
    'name': 'Humano SISU Bridge',
    'version': '18.0.1.1.0',
    'category': 'Human Resources',
    'summary': 'Import employees and draft payroll journal entries from Humano SISU',
    'license': 'LGPL-3',
    'depends': ['hr', 'account'],
    'data': [
        'security/sisu_security.xml',
        'security/ir.model.access.csv',
        'views/hr_employee_views.xml',
        'views/account_move_views.xml',
    ],
    'installable': True,
    'application': False,
}
