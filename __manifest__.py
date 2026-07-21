{
    'name': 'Odoo Studio CE',
    'summary': 'Community Edition replica of Odoo Enterprise Studio module',
    'description': """
        Odoo Studio CE allows customizing views (Form, List) and adding custom fields
        directly from the user interface.
    """,
    'author': 'Antigravity',
    'category': 'Customizations',
    'version': '1.0',
    'depends': ['base', 'web'],
    'data': [
        'security/ir.model.access.csv',
    ],
    'assets': {
        'web.assets_backend': [
            'web_studioCE/static/src/**/*.js',
            'web_studioCE/static/src/**/*.xml',
            'web_studioCE/static/src/**/*.scss',
        ],
    },
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
