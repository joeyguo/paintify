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

    var only = false;

    function paintRect(startX, startY) {
        var rect = document.createElement("div");
        rect.id = "activePaint";
        rect.className = "paint-rect";
        rect.style.left = startX + 'px';
        rect.style.top = startY + 'px';
        rect.style.cssText += "background: #99E9FC;width: 0px;height: 0px;position: absolute;opacity: 0.5;cursor: move;";
        return rect;
    }

    function paintRectTransformable(rect) {
        rect.onmousemove = function(e) {
            var rectStyle = rect.style;
            var rectDataset = rect.dataset;

            var top = parseInt(rectStyle.top.replace(/px/, ''), 10);
            var left = parseInt(rectStyle.left.replace(/px/, ''), 10);
            var width = parseInt(rectStyle.width.replace(/px/, ''), 10);
            var height = parseInt(rectStyle.height.replace(/px/, ''), 10);
            
            var currentX = e.pageX;
            var currentY = e.pageY;

            var positionLeft = currentX - left;
            var positionRight = left + width - currentX;

            var positionTop = currentY - top;
            var positionBottom = top + height - currentY;

            var distance = 14;

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
            } else if(positionBottom > 0 && positionBottom < distance) {
                rectDataset.direction = "b";
                rectStyle.cursor = "ns-resize";
            }else {
                rectDataset.direction = "c";
                rectStyle.cursor = "move";
            }
        };
    }

    var Paintify = function (drawingboard, option) {
        only = option.only;

        var positionType = window.getComputedStyle(drawingboard).position;

        if (positionType === 'static') {
            console.warn("Note: container's position(css) is static, changed it into relative");
            drawingboard.style.position = "relative";
        } 

        var down = function(e) {
            // 点击时初始坐标
            startX = e.pageX;
            startY = e.pageY;
            
            // 上一个坐标
            prevX = e.pageX;
            prevY = e.pageY;

            // 如果鼠标在 rect 上被按下
            if(e.target.className.match(/paint/)) {
                dragging = true; // 允许拖动
              
                // 去掉其他 rect 标识，设置当前 rect 的 id 为 transformingPaint
                drawingboard.querySelector("#transformingPaint") && drawingboard.querySelector("#transformingPaint").removeAttribute("id");
                e.target.id = "transformingPaint";

                // 设置当前方向
                direction = e.target.dataset.direction;

                // 初始坐标与 rect 左上角坐标之差，用于拖动
                diffX = startX - e.target.offsetLeft;
                diffY = startY - e.target.offsetTop;
            }
            else {
                if (only) {
                    var rectExisted = drawingboard.querySelector(".paint-rect");
                    rectExisted &&  rectExisted.parentNode.removeChild(rectExisted);
                }
                // 在页面创建 rect
                var rect = paintRect(startX, startY);
                drawingboard.appendChild(rect);
                paintRectTransformable(rect);
            }
        };
               
        var move = function(e) {
            // 更新 rect 尺寸
            if(drawingboard.querySelector("#activePaint") !== null) {
                var ab = drawingboard.querySelector("#activePaint");
                ab.style.width = e.pageX - startX + 'px';
                ab.style.height = e.pageY - startY + 'px';
            }
            
            // 移动，更新 rect 坐标
            if(drawingboard.querySelector("#transformingPaint") !== null && dragging) {
                var tp = drawingboard.querySelector("#transformingPaint");

                var tph = tp.offsetHeight;
                var tpw = tp.offsetWidth;

                var drawingboardHeight = drawingboard.offsetHeight;
                var drawingboardWidth = drawingboard.offsetWidth;

                var drawingboardX = e.pageX - diffX;
                var drawingboardY = e.pageY - diffY;

                var isOverY = tph + drawingboardY <= drawingboardHeight && drawingboardY >= 0? true: false;
                var isOverX = tpw + drawingboardX <= drawingboardWidth && drawingboardX >= 0? true: false;

                var afterWidthLeft = parseInt(tp.style.width.replace('px', ''), 10) - (e.pageX - prevX);
                var afterWidthRight = parseInt(tp.style.width.replace('px', ''), 10) + (e.pageX - prevX);
                var afterHeightTop = parseInt(tp.style.height.replace('px', ''), 10) - (e.pageY - prevY);
                var afterHeightBottom = parseInt(tp.style.height.replace('px', ''), 10) + (e.pageY - prevY);

                var afterLeft = e.pageX - diffX >= 0? e.pageX - diffX : 0;
                var afterTop = e.pageY - diffY >= 0? e.pageY - diffY : 0;
                var currentLeft = parseInt(tp.style.left.replace('px', ''), 10);
                var currentTop = parseInt(tp.style.top.replace('px', ''), 10);

                var isOverRight = (afterWidthRight + currentLeft > drawingboardWidth)? true: false;
                var isOverLeft = (afterWidthLeft + currentLeft > drawingboardWidth)? true: false;
                var isOverTop = (afterHeightTop + currentTop > drawingboardHeight)? true: false;
                var isOverBottom = (afterHeightBottom + currentTop > drawingboardHeight)? true: false;

                switch(direction){
                    case 'c':
                        isOverY && (tp.style.top = afterTop + 'px');
                        isOverX && (tp.style.left = afterLeft + 'px');
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
               
            }
        };
        
        var leave = function(){
            dragging = false; // 禁止拖动
            drawingboard.querySelector("#activePaint") && drawingboard.querySelector("#activePaint").removeAttribute("id");
        };

        drawingboard.onmousedown = down;
        drawingboard.onmousemove = move;
        drawingboard.onmouseleave = leave;
        drawingboard.onmouseup = leave;
    };

    // Paintify.prototype = {
    // };

    if (typeof module !== 'undefined' && typeof exports === 'object') {
        module.exports = Paintify;
    } else {
        window.Paintify = Paintify;
    }
}());

