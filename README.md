# Odoo Studio CE (Community Edition)

Odoo Studio CE is a powerful Community Edition replica of the Odoo Enterprise Studio module tailored specifically for **Odoo 19**. It allows administrators and developer users to customize views (Form and List) and add custom database fields directly from the web client interface.

---

## Key Features

- **Top Systray Toggle**: Instantly switch any supported view into Studio edit mode with a dedicated magic wand icon in the navigation bar.
- **Interactive Form View Builder**: Drag and drop new custom fields, reorder existing fields, hide fields, and mark fields as required or read-only on the fly.
- **Interactive List View Builder**: Add, reorder, hide, and modify list columns directly from the table headers.
- **Dynamic Database Fields**: Create real database columns (prefixed with `x_`) supporting multiple data types (Text, Checkbox, Dropdown, M2O relations) with online schema updates and auto-registry reload.
- **Unified Inheritance Engine**: All customizations are clean, non-destructive, and persisted inside a single inherited `ir.ui.view` extension record per base view.
- **In-Memory Undo/Redo**: Full state rollback stack for layout operations.
- **In-App Sidebar Documentation**: Comprehensive documentation directly accessible in the web client.

---

## Architecture Overview

Odoo Studio CE uses a decoupled frontend-backend architecture:

1. **`studio.editor` Model**: Python backend helper containing transaction-safe actions for adding fields (`ir.model.fields`), updating XML architectures, and tracking properties.
2. **`studio` OWL Service**: Frontend service keeping state of active selections, active actions, view definitions, and the undo/redo queues.
3. **OWL Compiler Overrides (`studio_form`, `studio_list`)**: Subclassed compilation processors that wrap standard Odoo OWL template renderers in clickable, drag-targetable, and highlighting design overlays.
4. **`StudioEditor` Layout Shell**: Workspace shell providing drag-and-drop palettes, configuration properties panels, and help documentation tabs.

---

## Installation

1. Place the `web_studioCE` folder in your Odoo custom addons directory.
2. Update your Odoo configuration configuration file (`odoo.conf`) to include the custom addons path:
   ```ini
   addons_path = /path/to/odoo/addons, /path/to/custom_addons
   ```
3. Restart the Odoo server.
4. Log into Odoo, activate developer mode, navigate to **Apps**, search for `Odoo Studio CE`, and click **Install**.

---

## Developer Testing

Run the included backend unit test suite targeting model properties retrieval and xpath updates:
```bash
python path/to/odoo-bin -c path/to/odoo.conf -d <your_db_name> -i web_studioCE --test-enable --stop-after-init
```
