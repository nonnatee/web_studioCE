from odoo.tests.common import TransactionCase
import lxml.etree as ET

class TestStudioEditor(TransactionCase):
    def setUp(self):
        super().setUp()
        self.studio_editor = self.env['studio.editor']
        self.test_view = self.env['ir.ui.view'].create({
            'name': 'Test Partner View',
            'model': 'res.partner',
            'type': 'form',
            'arch': '<form><sheet><field name="name"/></form>'
        })

    def test_get_view_arch_and_fields(self):
        res = self.studio_editor.get_view_arch_and_fields('res.partner', self.test_view.id, 'form')
        self.assertEqual(res['view_id'], self.test_view.id)
        self.assertIn('name', res['fields'])

    def test_edit_view_attribute(self):
        # Mark field 'name' as required="1"
        self.studio_editor.edit_view_attribute(
            self.test_view.id,
            "//field[@name='name']",
            "required",
            "1"
        )
        
        # Verify inherited view is created
        custom_view = self.env['ir.ui.view'].search([
            ('inherit_id', '=', self.test_view.id),
            ('mode', '=', 'extension')
        ], limit=1)
        self.assertTrue(custom_view.exists())
        
        # Parse arch to check attribute addition
        arch = ET.fromstring(custom_view.arch.encode('utf-8'))
        xpath = arch.find(".//xpath[@expr=\"//field[@name='name']\"]")
        self.assertIsNotNone(xpath)
        attr = xpath.find(".//attribute[@name='required']")
        self.assertIsNotNone(attr)
        self.assertEqual(attr.text, "1")

    def test_add_field_to_view(self):
        field_name = 'x_studio_test_char'
        self.studio_editor.add_field_to_view(
            'res.partner',
            self.test_view.id,
            "//field[@name='name']",
            "after",
            field_name,
            field_label="Studio Test Char",
            field_type="char"
        )
        
        # Check field exists in ir.model.fields
        field_rec = self.env['ir.model.fields'].search([
            ('model_id.model', '=', 'res.partner'),
            ('name', '=', field_name)
        ], limit=1)
        self.assertTrue(field_rec.exists())
        self.assertEqual(field_rec.ttype, 'char')

        # Check view contains xpath inserting the field
        custom_view = self.env['ir.ui.view'].search([
            ('inherit_id', '=', self.test_view.id),
            ('mode', '=', 'extension')
        ], limit=1)
        arch = ET.fromstring(custom_view.arch.encode('utf-8'))
        xpath = arch.find(".//xpath[@expr=\"//field[@name='name']\"][@position='after']")
        self.assertIsNotNone(xpath)
        field_node = xpath.find(".//field[@name='x_studio_test_char']")
        self.assertIsNotNone(field_node)
