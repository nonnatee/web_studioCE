import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { View } from "@web/views/view";

export class StudioEditor extends Component {
    static template = "web_studioCE.StudioEditor";
    static components = { View };
    static props = { "*": true };

    setup() {
        this.studio = useState(useService("studio"));
        this.orm = useService("orm");

        const handleDragEnd = () => {
            document.body.classList.remove("o_studio_dragging");
        };
        onMounted(() => {
            document.addEventListener("dragend", handleDragEnd);
        });
        onWillUnmount(() => {
            document.removeEventListener("dragend", handleDragEnd);
        });
    }

    get studioArch() {
        let arch = this.studio.arch || "";
        if (!arch) return arch;
        let jsClass = "studio_form";
        if (this.studio.activeViewType === "list") {
            jsClass = "studio_list";
        } else if (this.studio.activeViewType === "kanban") {
            jsClass = "studio_kanban";
        }
        
        if (arch.includes('js_class=')) {
            arch = arch.replace(/js_class="[^"]*"/, `js_class="${jsClass}"`);
            arch = arch.replace(/js_class='[^']*'/, `js_class="${jsClass}"`);
        } else {
            arch = arch.replace(/<([a-zA-Z0-9_]+)/, `<$1 js_class="${jsClass}"`);
        }
        return arch;
    }

    get existingFieldsNotInView() {
        const arch = this.studio.arch || "";
        return Object.entries(this.studio.fields)
            .filter(([name, field]) => {
                if (['id', 'create_uid', 'create_date', 'write_uid', 'write_date', '__last_update'].includes(name)) {
                    return false;
                }
                return !arch.includes(`name="${name}"`) && !arch.includes(`name='${name}'`);
            })
            .map(([name, field]) => ({ name, string: field.string }));
    }

    onDragStartNewField(ev, type, label) {
        document.body.classList.add("o_studio_dragging");
        ev.dataTransfer.setData("studio/new-field", JSON.stringify({ type, label }));
    }

    onDragStartExistingField(ev, name) {
        document.body.classList.add("o_studio_dragging");
        ev.dataTransfer.setData("studio/existing-field", name);
    }

    async addChatterSection() {
        await this.studio.pushAction(async () => {
            await this.orm.call("studio.editor", "add_chatter_to_view", [], {
                view_id: this.studio.activeViewId,
            });
        });
    }

    async addActionButton() {
        const name = prompt("Enter Technical Method Name for Button (e.g. action_confirm):", "action_custom");
        if (!name) return;
        const label = prompt("Enter Button Label:", "Custom Action");
        if (!label) return;

        await this.studio.pushAction(async () => {
            await this.orm.call("studio.editor", "add_button_to_view", [], {
                view_id: this.studio.activeViewId,
                button_name: name,
                button_label: label,
            });
        });
    }

    async addGroupSection() {
        const label = prompt("Enter Group Name:", "x_group_" + Math.random().toString(36).substring(2, 6));
        if (!label) return;

        await this.studio.pushAction(async () => {
            await this.orm.call("studio.editor", "add_group_to_view", [], {
                view_id: this.studio.activeViewId,
                target_xpath: "//sheet",
                position: "inside",
                group_name: label,
            });
        });
    }

    async addNotebookPageTab() {
        const name = prompt("Enter Page Technical Name:", "page_" + Math.random().toString(36).substring(2, 6));
        if (!name) return;
        const label = prompt("Enter Page Tab Title:", "Custom Page");
        if (!label) return;

        await this.studio.pushAction(async () => {
            await this.orm.call("studio.editor", "add_notebook_page", [], {
                view_id: this.studio.activeViewId,
                target_xpath: "//notebook",
                position: "inside",
                page_name: name,
                page_label: label,
            });
        });
    }

    // Property Sheet handlers
    async onPropertyChange(attr, value) {
        const selected = this.studio.selectedElement;
        if (!selected || !selected.xpath) return;

        await this.studio.pushAction(async () => {
            await this.orm.call("studio.editor", "edit_view_attribute", [], {
                view_id: this.studio.activeViewId,
                target_xpath: selected.xpath,
                attribute_name: attr,
                attribute_value: value,
            });
        });
    }

    async onRenameElement(newName) {
        const selected = this.studio.selectedElement;
        if (!selected || !selected.xpath) return;
        
        await this.studio.pushAction(async () => {
            await this.orm.call("studio.editor", "edit_view_attribute", [], {
                view_id: this.studio.activeViewId,
                target_xpath: selected.xpath,
                attribute_name: "string",
                attribute_value: newName,
            });
        });
    }

    async deleteSelectedElement() {
        const selected = this.studio.selectedElement;
        if (!selected || !selected.xpath) return;
        
        await this.studio.pushAction(async () => {
            await this.orm.call("studio.editor", "remove_element_from_view", [], {
                view_id: this.studio.activeViewId,
                target_xpath: selected.xpath,
            });
        });
    }

    closeFieldCreationModal() {
        this.studio.closeFieldCreationModal();
    }

    async confirmFieldCreation() {
        const pending = this.studio.pendingFieldCreation;
        if (!pending || !pending.xpath || !pending.position) return;
        
        const name = pending.fieldName;
        const label = pending.fieldLabel;
        const type = pending.type;
        const relation = pending.fieldRelation;

        await this.studio.pushAction(async () => {
            await this.orm.call("studio.editor", "add_field_to_view", [], {
                model_name: this.studio.activeModel,
                view_id: this.studio.activeViewId,
                target_xpath: pending.xpath,
                position: pending.position,
                field_name: name,
                field_label: label,
                field_type: type,
                relation_model: relation || null,
            });
        });

        this.closeFieldCreationModal();
    }
}

