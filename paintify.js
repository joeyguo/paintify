/*
 * paintify
 *
 * author joeyguo
 * Github: https://github.com/joeyguo/paintify.git
 * MIT Licensed.
 */

;(function () {
    'use strict';

    var startX,
        startY,
        diffX,
        diffY,
        prevX,
        prevY,
        direction,
        dragging = false;

    var emptyFunction = function (){}

    var paintifyblock_id = 0;

    var drawingboard = null,
        count = -1,
        blocks = [],
        distance = 10;


    var callbacks = {};
    function resigisterCallBack(paintifyblock_id, opt) {
        callbacks[paintifyblock_id] = {
            onStart: (opt.onStart || emptyFunction),
            onMove: (opt.onMove || emptyFunction),
            onStop: (opt.onStop || emptyFunction),
            onDrop: (opt.onDrop || emptyFunction),
            onDragover: (opt.onDragover || emptyFunction),
            onDragleave: (opt.onDragleave || emptyFunction),
            onDragenter: (opt.onDragenter || emptyFunction),
        };
    }

    var getStyle = function(o, key){
        return o.currentStyle? o.currentStyle[key] : document.defaultView.getComputedStyle(o,false)[key];   
    };

    var getMeasure = function(target) {
        return {
            top: getStyle(target, 'top') && parseInt(getStyle(target, 'top').replace(/px/, ''), 10),
            left: getStyle(target, 'left') && parseInt(getStyle(target, 'left').replace(/px/, ''), 10),
            height: getStyle(target, 'height') && parseInt(getStyle(target, 'height').replace(/px/, ''), 10),
            width: getStyle(target, 'width') && parseInt(getStyle(target, 'width').replace(/px/, ''), 10),
        };
    };

    function checkInDropbox(target, dropboxs, opt) {
        var currentMeasureData = getMeasure(target);
        var top = currentMeasureData.top,
            left = currentMeasureData.left,
            width = currentMeasureData.width,
            height = currentMeasureData.height;

        var overCallback = opt.overCallback || emptyFunction,
            enterCallback = opt.enterCallback || emptyFunction,
            leaveCallback = opt.leaveCallback || emptyFunction;

        var centerLeft = left + width / 2;
        var centerTop = top + height / 2;

        for (var i = 0, dropbox = null; i < dropboxs.length; i++) {
            dropbox = dropboxs[i];
            var dropboxMeasureData = dropbox.measureData;
            var dropboxTop = dropboxMeasureData.top;
            var dropboxLeft = dropboxMeasureData.left;
            var dropboxWidth = dropboxMeasureData.width;
            var dropboxHeight = dropboxMeasureData.height;
            if (centerLeft > dropboxLeft && centerLeft < dropboxLeft + dropboxWidth && centerTop > dropboxTop && centerTop < dropboxTop + dropboxHeight) {
                if (!dropbox.isEntered) {
                    enterCallback(target, dropbox);
                }
                dropbox.isEntered = true;
                overCallback(target, dropbox);
            } else {
                if (dropbox.isEntered) {
                    dropbox.isEntered = false;
                    leaveCallback && leaveCallback(target, dropbox);
                }
            }
        }
    }

    function paintRect(startX, startY) {
        var rect = document.createElement("div");
        rect.id = "activePaint";
        // rect.draggable=false;
        rect.className = "paint-rect";
        rect.dataset.paintifyblock = true;
        rect.style.left = startX + 'px';
        rect.style.top = startY + 'px';
        rect.style.cssText += "background: #99E9FC;width: 0px;height: 0px;position: absolute;opacity: 0.5;cursor: move;";
        return rect;
    }

    function paintRectTransformable(rect) {
        rect.onmousemove = function(e) {
            if (dragging) {
                return;
            }
            // e.stopPropagation();
            // console.log('rect.onmousemove')
            var rectStyle = rect.style;
            var rectDataset = rect.dataset;

            var measureData = getMeasure(rect);

            var top = measureData.top;
            var left = measureData.left;
            var width = measureData.width;
            var height = measureData.height;
            
            var currentX = e.pageX;
            var currentY = e.pageY;

            var drawingboardLeft = _drawingboard.offsetLeft;
            var drawingboardTop = _drawingboard.offsetTop;

            var positionLeft = (currentX - drawingboardLeft) - left;
            var positionRight = left + width - (currentX - drawingboardLeft);

            var positionTop = (currentY - drawingboardTop) - top;
            var positionBottom = top + height - (currentY - drawingboardTop);
            // distance = distance < 10? distance + 10: distance;
            // left
            if (positionLeft > 0 && positionLeft < distance) {
                if (positionTop < distance) {
                    rectStyle.cursor = "nwse-resize";
                    rectDataset.direction = "lt";
                } else if(positionBottom < distance) {
                    rectDataset.direction = "lb";
                    rectStyle.cursor = "nesw-resize";
                } else {
                    rectDataset.direction = "l";
                    rectStyle.cursor = "ew-resize";
                }
            // right
            } else if (positionRight < distance) {
                if (positionTop < distance) {
                    rectDataset.direction = "rt";
                    rectStyle.cursor = "nesw-resize";
                } else if(positionBottom < distance) {
                    rectDataset.direction = "rb";
                    rectStyle.cursor = "nwse-resize";
                } else {
                    rectDataset.direction = "r";
                    rectStyle.cursor = "ew-resize";
                }
            } else if (positionTop > 0 && positionTop < distance) {
                rectDataset.direction = "t";
                rectStyle.cursor = "ns-resize";
            } else if(positionBottom < distance) {
                rectDataset.direction = "b";
                rectStyle.cursor = "ns-resize";
            }else {
                rectDataset.direction = "c";
                rectStyle.cursor = "move";
            }
        };
    }

    function paintRectTransformableWithoutResize(rect) {
        rect.onmousemove = function(e) {
            if (dragging) {
                return;
            }
            rect.dataset.direction = "c";
            rect.style.cursor = "move";
        };
    }

    function contextMenu(drawingboard, onBlockContextMenu, onContextMenu) {
        drawingboard.oncontextmenu = function (e) {
            var target = e.target;
            var isPaintifyblock = false;
            var paintifyblockTarget = target;

            while(paintifyblockTarget !== drawingboard){
                if (paintifyblockTarget.dataset.paintifyblock) {
                    isPaintifyblock = true;
                    break;
                }
                paintifyblockTarget = paintifyblockTarget.parentNode;
            }

            if (isPaintifyblock) {
                onBlockContextMenu && onBlockContextMenu(paintifyblockTarget);
            } else {
                onContextMenu && onContextMenu(target);
            }
            return false;
        };
    }

    var Paintify = function (drawingboard, opt) {
        _drawingboard = drawingboard;
        opt = opt || {};
        blocks = opt.blocks || [];
        (opt.count !== undefined) && (count = opt.count);
        opt.distance && (distance = opt.distance);
        var withoutResizable = opt.withoutResizable;
        var onBlockContextMenu = opt.onBlockContextMenu;
        var onContextMenu = opt.onContextMenu;

        var positionType = window.getComputedStyle(drawingboard).position;

        (onBlockContextMenu || onContextMenu) && contextMenu(drawingboard, onBlockContextMenu, onContextMenu);
        
        // fix 拖拽时，鼠标显示禁止拖动的图示，“xx被选中了”
        drawingboard.style.userSelect= "none";
        drawingboard.style.webkitUserSelect= "none";
        if (positionType === 'static') {
            console.warn("Note: container's position(css) is static, changed it into relative");
            drawingboard.style.position = "relative";
        } 

        var target = null;
        var down = function(e) {
            // console.log('down')
            // 点击时初始坐标
            startX = e.pageX;
            startY = e.pageY;
            
            // 上一个坐标
            prevX = e.pageX;
            prevY = e.pageY;

            target = e.target;

            var isPaintifyblock = false;

            while(target !== drawingboard){
                if (target.dataset.paintifyblock) {
                    isPaintifyblock = true;
                    break;
                }
                target = target.parentNode;
            }

            target.combineDom = [];
            target.combine = function(dom) {
                target.combineDom.push(dom);
            };
            target.clearCombine = function(dom) {
                target.combineDom = [];
            };

            // 如果鼠标在 rect 上被按下
            if(isPaintifyblock) {
                dragging = true; // 允许拖动
                // 去掉其他 rect 标识，设置当前 rect 的 id 为 transformingPaint
                if (drawingboard.querySelector("[data-transformingpaint]")) {
                    delete drawingboard.querySelector("[data-transformingpaint]").dataset.transformingpaint;
                }
                target.dataset.transformingpaint = true;

                // 设置当前方向
                direction = target.dataset.direction;

                // 初始坐标与 rect 左上角坐标之差，用于拖动
                diffX = startX - target.offsetLeft;
                diffY = startY - target.offsetTop;

                target.dataset.beforemeasure = JSON.stringify({
                    top: target.style.top,
                    left: target.style.left,
                    width: target.style.width,
                    height: target.style.height,
                    zIndex: target.style.zIndex
                });

                target.reset = function() {
                    var beforemeasure = this.dataset.beforemeasure && JSON.parse(this.dataset.beforemeasure);
                    console.log('beforemeasure')
                    console.log(beforemeasure)
                    // this 指向 target
                    this.style.top = beforemeasure.top;
                    this.style.left = beforemeasure.left;
                    this.style.width = beforemeasure.width;
                    this.style.height = beforemeasure.height;
                    this.style.zIndex = beforemeasure.zIndex;
                };

                // callback
                callbacks[target.dataset.paintifyblock_id] && callbacks[target.dataset.paintifyblock_id].onStart(target);
            } else {
                var rectExisted = drawingboard.querySelectorAll(".paint-rect") || [];
                if (rectExisted.length < count || count < 0) {
                    // 在页面创建 rect
                    var rect = paintRect(startX, startY);
                    drawingboard.appendChild(rect);
                    if (withoutResizable) {
                        paintRectTransformableWithoutResize(rect);
                    } else {
                        paintRectTransformable(rect);
                    }

                    rect.dataset.paintifyblock_id = ++paintifyblock_id;
                    resigisterCallBack(paintifyblock_id, opt);

                    // callback
                    callbacks[paintifyblock_id] && callbacks[paintifyblock_id].onStart(rect);
                } 
            }
        };
               
        var move = function(e) {
            // console.log('move');
            // 更新 rect 尺寸
            if(drawingboard.querySelector("#activePaint") !== null) {
                var ab = drawingboard.querySelector("#activePaint");
                ab.style.width = e.pageX - startX + 'px';
                ab.style.height = e.pageY - startY + 'px';
                
                // callback
                callbacks[ab.dataset.paintifyblock_id] && callbacks[ab.dataset.paintifyblock_id].onMove(ab);
                return;
            }
            target && target.isOver === true && (target = null);

            // 移动，更新 rect 坐标
            if(target !== null && dragging ) {
            // if(drawingboard.querySelector("[data-transformingpaint]") !== null && dragging) {
                var tp = target;
                // var tp = drawingboard.querySelector("[data-transformingpaint]");
                var tph = tp.offsetHeight;
                var tpw = tp.offsetWidth;

                var drawingboardHeight = drawingboard.offsetHeight;
                var drawingboardWidth = drawingboard.offsetWidth;

                var drawingboardX = e.pageX - diffX;
                var drawingboardY = e.pageY - diffY;

                var isOverY = tph + drawingboardY <= drawingboardHeight && drawingboardY >= 0? true: false;
                var isOverX = tpw + drawingboardX <= drawingboardWidth && drawingboardX >= 0? true: false;

                var measureData = getMeasure(tp);
               
                var afterWidthLeft = measureData.width - (e.pageX - prevX);
                var afterWidthRight = measureData.width + (e.pageX - prevX);
                var afterHeightTop = measureData.height - (e.pageY - prevY);
                var afterHeightBottom = measureData.height + (e.pageY - prevY);

                var afterLeft = e.pageX - diffX >= 0? e.pageX - diffX : 0;
                var afterTop = e.pageY - diffY >= 0? e.pageY - diffY : 0;
                var currentLeft = measureData.left;
                var currentTop = measureData.top;

                var isOverRight = (afterWidthRight + currentLeft > drawingboardWidth)? true: false;
                var isOverLeft = (afterWidthLeft + currentLeft > drawingboardWidth)? true: false;
                var isOverTop = (afterHeightTop + currentTop > drawingboardHeight)? true: false;
                var isOverBottom = (afterHeightBottom + currentTop > drawingboardHeight)? true: false;

                var distanceTop = afterTop - currentTop;
                var distanceLeft = afterLeft - currentLeft;
                
                function modifyMeasure(tp, direction) {
                    switch(direction){
                        case 'c':
                            // 使用移动的距离，支持 combine
                            isOverY && (tp.style.top = parseInt(tp.style.top.replace('px', ''), 10) + distanceTop + 'px');
                            isOverX && (tp.style.left = parseInt(tp.style.left.replace('px', ''), 10) + distanceLeft + 'px');
                            break;

                        case 'lt':
                            tp.style.left = afterLeft + 'px';
                            tp.style.top = afterTop + 'px';
                            
                            tp.style.width = afterWidthLeft + 'px';
                            tp.style.height = afterHeightTop + 'px';
                            prevX = e.pageX;
                            prevY = e.pageY;
                            break;

                        case 'rt':
                            tp.style.top = afterTop + 'px';
                            tp.style.width = afterWidthRight + 'px';
                            tp.style.height = afterHeightTop + 'px';
                            prevX = e.pageX;
                            prevY = e.pageY;
                            break;

                        case 't':
                            tp.style.top = afterTop + 'px';
                            tp.style.height = afterHeightTop + 'px';
                            prevY = e.pageY;
                            break;

                        case 'lb':
                            if (!isOverLeft) {
                                tp.style.left = afterLeft + 'px';
                                tp.style.width = afterWidthLeft + 'px';
                            }
                            !isOverBottom && (tp.style.height = afterHeightBottom + 'px');
                            prevX = e.pageX;
                            prevY = e.pageY;
                            break;

                        case 'rb':
                            !isOverRight && (tp.style.width = afterWidthRight + 'px');
                            !isOverBottom && (tp.style.height = afterHeightBottom + 'px');
                            prevX = e.pageX;
                            prevY = e.pageY;
                            break;

                        case 'b':
                            !isOverBottom && (tp.style.height = afterHeightBottom + 'px');
                            prevY = e.pageY;
                            break;

                        case 'l':
                            if (!isOverLeft) {
                                tp.style.left = afterLeft + 'px';
                                tp.style.width = afterWidthLeft + 'px';
                            }
                            
                            prevX = e.pageX;
                            break;

                        case 'r':
                            !isOverRight && (tp.style.width = afterWidthRight + 'px');
                            prevX = e.pageX;
                            break;
                    }

                    if (dropboxs) {
                        checkInDropbox(tp, dropboxs, {
                            overCallback: function(target, dropbox){
                                var dropboxpaintifyblockId = dropbox.paintifyblock_id;
                                callbacks[dropboxpaintifyblockId].onDragover(target, dropbox.dom);
                            },
                            enterCallback: function(target, dropbox) {
                                var dropboxpaintifyblockId = dropbox.paintifyblock_id;
                                callbacks[dropboxpaintifyblockId].onDragenter(target, dropbox.dom);
                            },
                            leaveCallback: function(target, dropbox) {
                                var dropboxpaintifyblockId = dropbox.paintifyblock_id;
                                callbacks[dropboxpaintifyblockId].onDragleave(target, dropbox.dom);
                            }
                        });
                    }
                }

                modifyMeasure(tp, direction);

                for (var i = 0; i < target.combineDom.length; i++) {
                    modifyMeasure(target.combineDom[i], direction);
                }
                
                // callback
                callbacks[tp.dataset.paintifyblock_id] && callbacks[tp.dataset.paintifyblock_id].onMove(tp);
            }
        };
        
        function setBeforeMeasure(target) {
            target.dataset.beforemeasure = JSON.stringify({
                top: target.style.top,
                left: target.style.left,
                width: target.style.width,
                height: target.style.height,
                zIndex: target.style.zIndex
            });
        }

        var leave = function(){
            
            // console.log('leave')
            dragging = false; // 禁止拖动
            
            var ap = drawingboard.querySelector("#activePaint");
            var tp = drawingboard.querySelector("[data-transformingpaint]");
            
            var isInBox = false;
            if (dropboxs && tp !== null) {
                checkInDropbox(tp, dropboxs, {
                    overCallback: function(target, dropbox){
                        isInBox = true;
                        var dropboxpaintifyblockId = dropbox.paintifyblock_id;
                        callbacks[dropboxpaintifyblockId].onDrop(target, dropbox.dom);
                    }
                });
            }

            // 更新 rect 尺寸
            if(ap !== null) {
                ap.removeAttribute("id");
                // callback
                callbacks[ap.dataset.paintifyblock_id] && callbacks[ap.dataset.paintifyblock_id].onStop(ap);
            }
            // 移动，更新 rect 坐标
            if(tp !== null) {
                target = null;
                delete tp.dataset.transformingpaint;
                callbacks[tp.dataset.paintifyblock_id] && callbacks[tp.dataset.paintifyblock_id].onStop(tp, {
                    isInBox: isInBox
                });
                setBeforeMeasure(tp);
            }

            // 清除绑定
            target && target.clearCombine && target.clearCombine();

        };

        drawingboard.onmousedown = down;
        drawingboard.onmousemove = move;
        drawingboard.onmouseleave = leave;
        drawingboard.onmouseup = leave;
    };

    var dropboxs = [];
    Paintify.prototype = {
        transformable: function(blocks, opt) {
            var blocksType = Object.prototype.toString.call(blocks);
            if (!( blocksType === '[object Array]' || blocksType === '[object NodeList]')) {
                blocks = [blocks];
            }
            opt = opt || {};
            var withoutResizable = opt.withoutResizable;
            var arr = [];
            for (var i = 0, block = null; i < blocks.length; i++) {
                block = blocks[i];
                // dom 不存在时
                if (!block) return;
                block.dataset.paintifyblock_id = ++paintifyblock_id;
                resigisterCallBack(paintifyblock_id, opt);

                block.dataset.paintifyblock = true;

                if (withoutResizable) {
                    paintRectTransformableWithoutResize(block);
                } else {
                    paintRectTransformable(block);
                }

                var blockPositionType = window.getComputedStyle(block).position;
                if (blockPositionType !== 'absolute') {
                    var blockTop = block.offsetTop;
                    var blockLeft = block.offsetLeft;
                    var blockWidth = block.offsetWidth;
                    var blockHeight = block.offsetHeight;
                    arr.push({
                        dom: block,
                        left: blockLeft,
                        top: blockTop,
                        width: blockWidth,
                        height: blockHeight,
                    });
                }
            }

            arr.map(function(item,i){
                var d = item.dom;
                d.style.position = 'absolute';
                d.style.top = item.top + 'px';
                d.style.left = item.left + 'px';

                // TODO block dom 在 absolute 时为 inline-block width
                // 设置了 width 则会导致远 dom 会自动伸缩的特性，考虑用 min-width
                // d.style.width = item.width + 'px';
                // d.style.height = item.height + 'px';
                d.style.margin = 0;
                console.warn("Note:", d, "position(css) is changed into absolute");
            });
        },
        block: function(blocks, opt) {
            var blocksType = Object.prototype.toString.call(blocks);
            if (!( blocksType === '[object Array]' || blocksType === '[object NodeList]')) {
                blocks = [blocks];
            }
            opt = opt || {};
            var resize = opt.resize;
            var move = opt.move;
            var drop = opt.drop;

            var withoutResizable = opt.withoutResizable;
            var arr = [];
            for (var i = 0, block = null; i < blocks.length; i++) {
                block = blocks[i];
                // dom 不存在时
                if (!block) return;
                block.dataset.paintifyblock_id = ++paintifyblock_id;
                resigisterCallBack(paintifyblock_id, opt);

                block.dataset.paintifyblock = true;

                if (resize && move) {
                    paintRectTransformable(block);
                }
                if (move) {
                    paintRectTransformableWithoutResize(block);
                }
                if (drop) {

                }

                var blockPositionType = window.getComputedStyle(block).position;
                if (blockPositionType !== 'absolute') {
                    var blockTop = block.offsetTop;
                    var blockLeft = block.offsetLeft;
                    var blockWidth = block.offsetWidth;
                    var blockHeight = block.offsetHeight;
                    arr.push({
                        paintifyblock_id: paintifyblock_id,
                        dom: block,
                        left: blockLeft,
                        top: blockTop,
                        width: blockWidth,
                        height: blockHeight,
                    });
                }
            }

            arr.map(function(item,i){
                var d = item.dom;
                d.style.position = 'absolute';
                d.style.top = item.top + 'px';
                d.style.left = item.left + 'px';

                // TODO block dom 在 absolute 时为 inline-block width
                // 设置了 width 则会导致远 dom 会自动伸缩的特性，考虑用 min-width
                // d.style.width = item.width + 'px';
                // d.style.height = item.height + 'px';
                d.style.margin = 0;

                if (drop) {
                    dropboxs.push({
                        paintifyblock_id: item.paintifyblock_id, 
                        dom: d,
                        measureData: {
                            left: item.left,
                            top: item.top,
                            width: item.width,
                            height: item.height
                        },
                        onDrop: (opt.onDrop || emptyFunction),
                        onDragover: (opt.onDragover || emptyFunction),
                    });
                }

                // console.warn("Note:", d, "position(css) is changed into absolute");
            });
        }
    };

    if (typeof module !== 'undefined' && typeof exports === 'object') {
        module.exports = Paintify;
    } else {
        window.Paintify = Paintify;
    }
}());