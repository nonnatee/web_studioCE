import logging
from odoo import models, api, fields
import lxml.etree as ET

_logger = logging.getLogger(__name__)

class StudioEditor(models.AbstractModel):
    _name = 'studio.editor'
    _description = 'Odoo StudioCE Editor Backend Helper'

    @api.model
    def get_view_arch_and_fields(self, model_name, view_id, view_type):
        """
        Retrieves the architecture XML, field definitions, and relational models for editing.
        """
        if not model_name or model_name not in self.env:
            _logger.warning("Studio CE: Invalid or missing model_name '%s'", model_name)
            return {'view_id': False, 'arch': False, 'fields': {}, 'models': {}, 'relatedModels': {}}

        # Sanitize view_id parameter
        clean_view_id = view_id if (view_id and isinstance(view_id, int)) else None

        try:
            # Standard Odoo get_view method is JSON-serializable and handles inheritance + relational models
            view_info = self.env[model_name].get_view(view_id=clean_view_id, view_type=view_type)
            res_view_id = view_info.get('id') or view_id or False
            arch = view_info.get('arch')
            fields_info = view_info.get('fields', {}) or {}
            models_dict = view_info.get('models', {}) or {}

            # Ensure main model_name is present in models_dict with fields
            if model_name not in models_dict or not isinstance(models_dict[model_name], dict):
                models_dict[model_name] = {}
            models_dict[model_name]['fields'] = fields_info

            return {
                'view_id': res_view_id,
                'arch': arch,
                'fields': fields_info,
                'models': models_dict,
                'relatedModels': models_dict,
            }
        except Exception as e:
            _logger.warning("Studio CE: get_view failed for %s (%s), trying fallback: %s", model_name, view_type, e)

        # Fallback if get_view fails
        try:
            view = self.env['ir.ui.view'].browse(clean_view_id) if clean_view_id else self.env['ir.ui.view']
            if not view.exists():
                view_types = [view_type]
                if view_type == 'list':
                    view_types.append('tree')
                elif view_type == 'tree':
                    view_types.append('list')
                view = self.env['ir.ui.view'].search([
                    ('model', '=', model_name),
                    ('type', 'in', view_types)
                ], limit=1)

            res_view_id = view.id if view else False
            arch = view.arch if view else False
            
            fields_info = self.env[model_name].fields_get()
            models_dict = { model_name: { 'fields': fields_info } }

            return {
                'view_id': res_view_id,
                'arch': arch,
                'fields': fields_info,
                'models': models_dict,
                'relatedModels': models_dict,
            }
        except Exception as fallback_e:
            _logger.error("Studio CE: Fallback failed for %s: %s", model_name, fallback_e)
            return {'view_id': False, 'arch': False, 'fields': {}, 'models': {}, 'relatedModels': {}}

    def _get_or_create_custom_view(self, base_view):
        """
        Retrieves the unique custom inherited view for this base view,
        or creates it if it doesn\'t exist.
        """
        custom_name = f"StudioCE Customization: {base_view.name or base_view.key or base_view.id}"
        custom_view = self.env['ir.ui.view'].search([
            ('inherit_id', '=', base_view.id),
            ('mode', '=', 'extension'),
            ('name', '=', custom_name)
        ], limit=1)
        
        if not custom_view:
            custom_view = self.env['ir.ui.view'].create({
                'name': custom_name,
                'model': base_view.model,
                'inherit_id': base_view.id,
                'mode': 'extension',
                'priority': 99,  # High priority to apply customizations last
                'arch': '<data></data>'
            })
        return custom_view

    @api.model
    def edit_view_attribute(self, view_id, target_xpath, attribute_name, attribute_value):
        """
        Sets or modifies an attribute of a view node via xpath.
        """
        base_view = self.env['ir.ui.view'].browse(view_id)
        if not base_view.exists():
            return False
            
        custom_view = self._get_or_create_custom_view(base_view)
        
        # Parse the custom inherited arch
        parser = ET.XMLParser(remove_blank_text=True)
        arch_xml = ET.fromstring(custom_view.arch.encode('utf-8'), parser)
        
        # Search if there is already an xpath node targeting this xpath with position="attributes"
        xpath_node = arch_xml.find(f"./xpath[@expr=\"{target_xpath}\"][@position=\"attributes\"]")
        if xpath_node is None:
            xpath_node = ET.SubElement(arch_xml, 'xpath', expr=target_xpath, position='attributes')
            
        # Check if attribute already set in this xpath
        attr_node = xpath_node.find(f"./attribute[@name=\"{attribute_name}\"]")
        if attr_node is None:
            attr_node = ET.SubElement(xpath_node, 'attribute', name=attribute_name)
            
        attr_node.text = str(attribute_value)
        
        # Write back
        custom_view.arch = ET.tostring(arch_xml, encoding='utf-8', pretty_print=True).decode('utf-8')
        return True

    @api.model
    def add_field_to_view(self, model_name, view_id, target_xpath, position, field_name, field_label=None, field_type=None, relation_model=None, selection_values=None):
        """
        Creates a custom field if it does not exist, and inserts it into the view at target_xpath.
        """
        base_view = self.env['ir.ui.view'].browse(view_id)
        if not base_view.exists():
            return False
            
        model_rec = self.env['ir.model'].search([('model', '=', model_name)], limit=1)
        if not model_rec:
            return False
            
        # Prepend x_ for custom fields
        if not field_name.startswith('x_'):
            field_name = f"x_{field_name}"
            
        # Create field if it does not exist and field parameters are provided
        existing_field = self.env['ir.model.fields'].search([
            ('model_id', '=', model_rec.id),
            ('name', '=', field_name)
        ], limit=1)
        
        if not existing_field and field_type:
            field_vals = {
                'name': field_name,
                'model_id': model_rec.id,
                'field_description': field_label or field_name,
                'ttype': field_type,
                'state': 'manual', # Defines it as a custom field
            }
            if field_type == 'many2one' and relation_model:
                field_vals['relation'] = relation_model
            if field_type == 'selection' and selection_values:
                field_vals['selection'] = str(selection_values)
                
            self.env['ir.model.fields'].create(field_vals)
            
        # Now add the field to the custom view architecture
        custom_view = self._get_or_create_custom_view(base_view)
        
        parser = ET.XMLParser(remove_blank_text=True)
        arch_xml = ET.fromstring(custom_view.arch.encode('utf-8'), parser)
        
        # Find if xpath with same target and position already exists to avoid clutter
        xpath_node = arch_xml.find(f"./xpath[@expr=\"{target_xpath}\"][@position=\"{position}\"]")
        if xpath_node is None:
            xpath_node = ET.SubElement(arch_xml, 'xpath', expr=target_xpath, position=position)
            
        # Append the new field element
        ET.SubElement(xpath_node, 'field', name=field_name)
        
        # Write back
        custom_view.arch = ET.tostring(arch_xml, encoding='utf-8', pretty_print=True).decode('utf-8')
        return True

    @api.model
    def remove_element_from_view(self, view_id, target_xpath):
        """
        Removes an element from the view layout by injecting a replace xpath.
        """
        base_view = self.env['ir.ui.view'].browse(view_id)
        if not base_view.exists():
            return False
            
        custom_view = self._get_or_create_custom_view(base_view)
        
        parser = ET.XMLParser(remove_blank_text=True)
        arch_xml = ET.fromstring(custom_view.arch.encode('utf-8'), parser)
        
        # Inject replacement xpath that removes the target element
        ET.SubElement(arch_xml, 'xpath', expr=target_xpath, position='replace')
        
        # Write back
        custom_view.arch = ET.tostring(arch_xml, encoding='utf-8', pretty_print=True).decode('utf-8')
        return True

    @api.model
    def add_notebook_page(self, view_id, target_xpath, page_name, page_label):
        """
        Appends a new page (tab) to a notebook element in the view.
        """
        base_view = self.env['ir.ui.view'].browse(view_id)
        if not base_view.exists():
            return False
            
        custom_view = self._get_or_create_custom_view(base_view)
        
        parser = ET.XMLParser(remove_blank_text=True)
        arch_xml = ET.fromstring(custom_view.arch.encode('utf-8'), parser)
        
        xpath_node = ET.SubElement(arch_xml, 'xpath', expr=target_xpath, position='inside')
        
        # Add new page element
        ET.SubElement(xpath_node, 'page', name=page_name, string=page_label)
        
        custom_view.arch = ET.tostring(arch_xml, encoding='utf-8', pretty_print=True).decode('utf-8')
        return True

    @api.model
    def add_group_to_view(self, view_id, target_xpath, position, group_name):
        """
        Adds a new group layout element to the view.
        """
        base_view = self.env['ir.ui.view'].browse(view_id)
        if not base_view.exists():
            return False
            
        custom_view = self._get_or_create_custom_view(base_view)
        
        parser = ET.XMLParser(remove_blank_text=True)
        arch_xml = ET.fromstring(custom_view.arch.encode('utf-8'), parser)
        
        xpath_node = ET.SubElement(arch_xml, 'xpath', expr=target_xpath, position=position)
        
        # Add new group node (with standard nested 2-column group layout)
        outer_group = ET.SubElement(xpath_node, 'group', name=group_name)
        ET.SubElement(outer_group, 'group')
        ET.SubElement(outer_group, 'group')
        
        custom_view.arch = ET.tostring(arch_xml, encoding='utf-8', pretty_print=True).decode('utf-8')
        return True
