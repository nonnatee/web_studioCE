import { FormCompiler } from "@web/views/form/form_compiler";
import { createElement, append } from "@web/core/utils/xml";

export class StudioFormCompiler extends FormCompiler {
    compileField(el, params) {
        const node = super.compileField(el, params);
        const fieldName = el.getAttribute("name");
        const xpath = `//field[@name='${fieldName}']`;

        // Wrap the compiled field in a designer overlay
        const wrapper = createElement("div", {
            class: `"o_web_studio_field_target position-relative d-block w-100"`,
            "t-on-click.stop": `(ev) => __comp__.onElementSelect(ev, 'field', '${xpath}', '${fieldName}')`,
            "data-studio-xpath": `'${xpath}'`,
            "data-studio-name": `'${fieldName}'`,
            // Drag and drop setup
            "t-on-dragover.prevent": `(ev) => __comp__.onDragOver(ev)`,
            "t-on-dragleave": `(ev) => __comp__.onDragLeave(ev)`,
            "t-on-drop.stop": `(ev) => __comp__.onDrop(ev, '${xpath}', 'after')`,
        });
        
        wrapper.setAttribute("t-att-class", `__comp__.studio.selectedElement?.xpath === '${xpath}' ? 'o_selected' : ''`);
        append(wrapper, node);
        return wrapper;
    }

    compileGroup(el, params) {
        const node = super.compileGroup(el, params);
        const groupName = el.getAttribute("name") || el.getAttribute("string") || "";
        const xpath = groupName ? `//group[@name='${groupName}']` : `//group[1]`;

        const wrapper = createElement("div", {
            class: `"o_web_studio_group_target w-100"`,
            "t-on-click.stop": `(ev) => __comp__.onElementSelect(ev, 'group', '${xpath}', '${groupName || 'Group'}')`,
            "t-on-dragover.prevent": `(ev) => __comp__.onDragOver(ev)`,
            "t-on-dragleave": `(ev) => __comp__.onDragLeave(ev)`,
            "t-on-drop.stop": `(ev) => __comp__.onDrop(ev, '${xpath}', 'inside')`,
        });

        wrapper.setAttribute("t-att-class", `__comp__.studio.selectedElement?.xpath === '${xpath}' ? 'o_selected' : ''`);
        append(wrapper, node);
        return wrapper;
    }
}
