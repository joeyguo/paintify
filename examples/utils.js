;(function(global){
    function copyDom(node){
        var div = document.createElement("div");
        div.setAttribute("id", node.id);
        div.setAttribute("class", node.className);
        div.setAttribute("contenteditable", "true");
        div.innerHTML = node.innerHTML;
        div.style.opacity = "0";
        div.style.position = "fixed";

        var parentNode = node.parentNode;
        parentNode.insertBefore(div, parentNode.firstChild);
        
        div.focus();
        document.execCommand("selectAll");
        document.execCommand("Copy");

        div.addEventListener('blur', ()=>{
            parentNode.removeChild(div);
        });
    }

    window.utils = {
        copyDom: copyDom
    };
}(window));


