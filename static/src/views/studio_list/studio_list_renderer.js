import { ListRenderer } from "@web/views/list/list_renderer";
import { useService } from "@web/core/utils/hooks";

export class StudioListRenderer extends ListRenderer {
    static template = "web_studioCE.StudioListRenderer";

    setup() {
        super.setup();
        this.studio = useService("studio");
        this.orm = useService("orm");
    }

    onColumnSelect(ev, column) {
        const xpath = `//field[@name='${column.name}']`;
        
        // Retrieve modifiers
        const fieldInfo = this.props.archInfo.fieldNodes[column.name] || {};
        const mods = fieldInfo.modifiers || {};

        this.studio.setSelectedElement({
            type: "column",
            xpath,
            name: column.name,
            string: column.label || this.props.list.model.env.fields[column.name]?.string || column.name,
            invisible: !!mods.invisible,
            readonly: !!mods.readonly,
            required: !!mods.required,
        });
    }

    onDragOver(ev) {
        ev.currentTarget.classList.add("o_studio_drag_hover");
        ev.preventDefault();
    }

    onDragLeave(ev) {
        ev.currentTarget.classList.remove("o_studio_drag_hover");
    }

    async onDrop(ev, column) {
        ev.currentTarget.classList.remove("o_studio_drag_hover");
        
        const targetXpath = `//field[@name='${column.name}']`;
        const newFieldData = ev.dataTransfer.getData("studio/new-field");
        const existingFieldName = ev.dataTransfer.getData("studio/existing-field");

        if (newFieldData) {
            const { type, label } = JSON.parse(newFieldData);
            this.env.openFieldCreationModal(type, label, targetXpath, "after");
        } else if (existingFieldName) {
            await this.studio.pushAction(async () => {
                await this.orm.call("studio.editor", "add_field_to_view", [], {
                    model_name: this.studio.activeModel,
                    view_id: this.studio.activeViewId,
                    target_xpath: targetXpath,
                    position: "after",
                    field_name: existingFieldName,
                });
            });
        }
    }
}
