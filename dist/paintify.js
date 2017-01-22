'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*
 * paintify
 *
 * author joeyguo
 * Github: https://github.com/joeyguo/paintify.git
 * MIT Licensed.
 */

;(function () {
    'use strict';

    var _drawingboard = null,
        distance = 10,
        paintid = 0,
        dragging = null,
        callbacks = {},
        dropboxs = [];

    var database = {
        id: {
            combine: [],
            measure: [] // 现在只保留最后一个
        }
    };

    var emptyFunction = function emptyFunction() {};

    var getStyle = function getStyle(o, key) {
        return document.defaultView.getComputedStyle(o, false)[key];
    };

    var getMeasure = function getMeasure(target) {
        return {
            top: getStyle(target, 'top') && parseInt(getStyle(target, 'top').replace(/px/, ''), 10),
            left: getStyle(target, 'left') && parseInt(getStyle(target, 'left').replace(/px/, ''), 10),
            height: getStyle(target, 'height') && parseInt(getStyle(target, 'height').replace(/px/, ''), 10),
            width: getStyle(target, 'width') && parseInt(getStyle(target, 'width').replace(/px/, ''), 10)
        };
    };

    function register(paintid, opt) {
        callbacks[paintid] = {
            onStart: opt.onStart || emptyFunction,
            onMove: opt.onMove || emptyFunction,
            onStop: opt.onStop || emptyFunction,
            onDrop: opt.onDrop || emptyFunction,
            onDragover: opt.onDragover || emptyFunction,
            onDragleave: opt.onDragleave || emptyFunction,
            onDragenter: opt.onDragenter || emptyFunction
        };
    }

    function checkInDropbox(target, dropboxs, opt) {
        var currentMD = getMeasure(target),
            top = currentMD.top,
            left = currentMD.left,
            width = currentMD.width,
            height = currentMD.height,
            centerLeft = left + width / 2,
            centerTop = top + height / 2;

        for (var i = 0, dropbox = null, dbMD = null, dbTop = 0, dbLeft = 0, dbWidth = 0, dbHeight = 0; i < dropboxs.length; i++) {
            dropbox = dropboxs[i];
            dbMD = dropbox.measureData, dbTop = dbMD.top, dbLeft = dbMD.left, dbWidth = dbMD.width, dbHeight = dbMD.height;

            // check
            if (centerLeft > dbLeft && centerLeft < dbLeft + dbWidth && centerTop > dbTop && centerTop < dbTop + dbHeight) {
                if (!dropbox.isEntered) {
                    dropbox.isEntered = true;
                    opt.enterCallback && opt.enterCallback(target, dropbox);
                } else {
                    opt.overCallback && opt.overCallback(target, dropbox);
                }
            } else {
                if (dropbox.isEntered) {
                    dropbox.isEntered = false;
                    opt.leaveCallback && opt.leaveCallback(target, dropbox);
                }
            }
        }
    }

    function paintRect(startX, startY) {
        var rect = document.createElement("div");
        rect.className = "paint-rect";
        rect.dataset._painting = true;
        rect.style.left = startX + 'px';
        rect.style.top = startY + 'px';
        rect.style.cssText += "background: #99E9FC;width: 0px;height: 0px;position: absolute;opacity: 0.5;cursor: move;";
        return rect;
    }

    function transformable(rect) {
        rect.onmousemove = function (e) {
            if (dragging) return;

            var style = rect.style,
                dataset = rect.dataset;

            var _getMeasure = getMeasure(rect),
                top = _getMeasure.top,
                left = _getMeasure.left,
                width = _getMeasure.width,
                height = _getMeasure.height;

            var currentX = e.pageX,
                currentY = e.pageY;

            var drawingboardLeft = _drawingboard.offsetLeft,
                drawingboardTop = _drawingboard.offsetTop;

            var positionLeft = currentX - drawingboardLeft - left,
                positionRight = left + width - (currentX - drawingboardLeft),
                positionTop = currentY - drawingboardTop - top,
                positionBottom = top + height - (currentY - drawingboardTop);

            if (positionLeft > 0 && positionLeft < distance) {
                if (positionTop < distance) {
                    dataset.direction = "lt";
                    style.cursor = "nwse-resize";
                } else if (positionBottom < distance) {
                    dataset.direction = "lb";
                    style.cursor = "nesw-resize";
                } else {
                    dataset.direction = "l";
                    style.cursor = "ew-resize";
                }
            } else if (positionRight < distance) {
                if (positionTop < distance) {
                    dataset.direction = "rt";
                    style.cursor = "nesw-resize";
                } else if (positionBottom < distance) {
                    dataset.direction = "rb";
                    style.cursor = "nwse-resize";
                } else {
                    dataset.direction = "r";
                    style.cursor = "ew-resize";
                }
            } else if (positionTop > 0 && positionTop < distance) {
                dataset.direction = "t";
                style.cursor = "ns-resize";
            } else if (positionBottom < distance) {
                dataset.direction = "b";
                style.cursor = "ns-resize";
            } else {
                dataset.direction = "c";
                style.cursor = "move";
            }
        };
    }

    function movable(rect) {
        rect.onmousemove = function (e) {
            if (dragging) {
                return;
            }
            rect.dataset.direction = "c";
            rect.style.cursor = "move";
        };
    }

    function contextMenu(drawingboard, onBlockContextMenu, onContextMenu) {
        drawingboard.oncontextmenu = function (e) {
            var target = e.target,
                isPaintifyblock = false,
                paintifyblockTarget = target;

            while (paintifyblockTarget !== drawingboard) {
                if (paintifyblockTarget.dataset.paintid) {
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

    function setBeforeMeasure(target) {
        var targetId = target.dataset.paintid;
        var style = target.style;
        database[targetId] = database[targetId] ? database[targetId] : {};
        // database[targetId]["measure"] = database[targetId]["measure"]? database[targetId]["measure"]: [];
        database[targetId]["measure"] = [];
        database[targetId]["measure"].push({
            top: style.top,
            left: style.left,
            width: style.width,
            height: style.height,
            zIndex: style.zIndex
        });
    }

    function getBeforeMeasure(target) {
        var targetId = target.dataset.paintid;

        database[targetId] = database[targetId] ? database[targetId] : {};
        database[targetId]["measure"] = database[targetId]["measure"] ? database[targetId]["measure"] : [];
        return database[targetId]["measure"].pop();
    }

    function getCombinedTargets(target) {
        var targetId = target.dataset.paintid;
        return database[targetId] && database[targetId]["combine"] || [];
    }

    function clearCombinedTargets(target) {
        var targetId = target.dataset.paintid;
        if (database[targetId] && database[targetId]["combine"]) {
            delete database[targetId]["combine"];
        }
    }

    var Paintify = function Paintify(drawingboard) {
        var opt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};


        var startX = void 0,
            startY = void 0,
            diffX = void 0,
            diffY = void 0,
            prevX = void 0,
            prevY = void 0,
            direction = void 0,
            target = null;

        // opts
        var blocks = opt.blocks || [],
            count = opt.count !== undefined ? opt.count : -1,
            resize = opt.resize,
            move = opt.move,
            drop = opt.drop,
            onBlockContextMenu = opt.onBlockContextMenu,
            onContextMenu = opt.onContextMenu;

        distance = opt.distance ? opt.distance : distance;

        _drawingboard = drawingboard;

        // fix 拖拽时，鼠标显示禁止拖动的图示，"xx被选中了"
        drawingboard.style.userSelect = "none";
        drawingboard.style.webkitUserSelect = "none";

        if (window.getComputedStyle(drawingboard).position === 'static') {
            drawingboard.style.position = "relative";
            console.warn("Note: container's position(css) is static, changed it into relative");
        }

        if (onBlockContextMenu || onContextMenu) {
            contextMenu(drawingboard, onBlockContextMenu, onContextMenu);
        }

        var downCb = function downCb(e) {
            console.log('down');
            startX = e.pageX;
            startY = e.pageY;
            prevX = e.pageX;
            prevY = e.pageY;
            target = e.target;

            var isPaintifyblock = false;

            while (target !== drawingboard) {
                if (target.dataset.paintid) {
                    isPaintifyblock = true;
                    break;
                }
                target = target.parentNode;
            }

            // 如果鼠标在 rect 上被按下
            if (isPaintifyblock) {
                dragging = target; // 拖动对象
                direction = target.dataset.direction; // 当前方向

                // 初始坐标与 rect 左上角坐标之差，用于拖动
                diffX = startX - target.offsetLeft;
                diffY = startY - target.offsetTop;

                setBeforeMeasure(target);

                callbacks[target.dataset.paintid] && callbacks[target.dataset.paintid].onStart(target);
            } else {
                var _paintingExisted = drawingboard.querySelector("[data-_painting]") || [];
                if (_paintingExisted.length < count || count < 0) {
                    // 在页面创建 rect
                    var rect = paintRect(startX, startY);
                    drawingboard.appendChild(rect);
                    if (resize && move) {
                        transformable(rect);
                    } else if (move) {
                        movable(rect);
                    }
                    if (drop) {}

                    rect.dataset.paintid = ++paintid;
                    register(paintid, opt);

                    target = rect;
                    callbacks[paintid] && callbacks[paintid].onStart(rect);
                } else {
                    target = null;
                }
            }
        };

        var moveCb = function moveCb(e) {
            console.log('move');
            target && target.isOver === true && (target = null);
            if (target === null) return;
            if (!dragging) {
                target.style.width = e.pageX - startX + 'px';
                target.style.height = e.pageY - startY + 'px';

                callbacks[target.dataset.paintid] && callbacks[target.dataset.paintid].onMove(target);
                return;
            } else {
                var modifyMeasure = function modifyMeasure(tp, direction) {
                    switch (direction) {
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
                            overCallback: function overCallback(target, dropbox) {
                                callbacks[dropbox.paintid].onDragover(target, dropbox.dom);
                            },
                            enterCallback: function enterCallback(target, dropbox) {
                                callbacks[dropbox.paintid].onDragenter(target, dropbox.dom);
                            },
                            leaveCallback: function leaveCallback(target, dropbox) {
                                callbacks[dropbox.paintid].onDragleave(target, dropbox.dom);
                            }
                        });
                    }
                };

                var tph = target.offsetHeight;
                var tpw = target.offsetWidth;

                var drawingboardHeight = drawingboard.offsetHeight;
                var drawingboardWidth = drawingboard.offsetWidth;

                var drawingboardX = e.pageX - diffX;
                var drawingboardY = e.pageY - diffY;

                var isOverY = tph + drawingboardY <= drawingboardHeight && drawingboardY >= 0 ? true : false;
                var isOverX = tpw + drawingboardX <= drawingboardWidth && drawingboardX >= 0 ? true : false;

                var measureData = getMeasure(target);

                var afterWidthLeft = measureData.width - (e.pageX - prevX);
                var afterWidthRight = measureData.width + (e.pageX - prevX);
                var afterHeightTop = measureData.height - (e.pageY - prevY);
                var afterHeightBottom = measureData.height + (e.pageY - prevY);

                var afterLeft = e.pageX - diffX >= 0 ? e.pageX - diffX : 0;
                var afterTop = e.pageY - diffY >= 0 ? e.pageY - diffY : 0;
                var currentLeft = measureData.left;
                var currentTop = measureData.top;

                var isOverRight = afterWidthRight + currentLeft > drawingboardWidth ? true : false;
                var isOverLeft = afterWidthLeft + currentLeft > drawingboardWidth ? true : false;
                var isOverTop = afterHeightTop + currentTop > drawingboardHeight ? true : false;
                var isOverBottom = afterHeightBottom + currentTop > drawingboardHeight ? true : false;

                var distanceTop = afterTop - currentTop;
                var distanceLeft = afterLeft - currentLeft;

                modifyMeasure(target, direction);
                callbacks[target.dataset.paintid] && callbacks[target.dataset.paintid].onMove(target);

                for (var i = 0, dom = null, combinedTargets = getCombinedTargets(target); i < combinedTargets.length; i++) {
                    dom = combinedTargets[i];
                    modifyMeasure(dom, direction);
                    callbacks[dom.dataset.paintid] && callbacks[dom.dataset.paintid].onMove(dom);
                }
            }
        };

        var leaveCb = function leaveCb() {
            // console.log('leave');
            if (target === null) return;

            var isInBox = false;

            if (dropboxs) {
                checkInDropbox(target, dropboxs, {
                    overCallback: function overCallback(target, dropbox) {
                        isInBox = true;
                        console.log('isInBox', isInBox);
                        callbacks[dropbox.paintid].onDrop(target, dropbox.dom);
                    }
                });
            }

            callbacks[target.dataset.paintid] && callbacks[target.dataset.paintid].onStop(target, {
                isInBox: isInBox
            });

            setBeforeMeasure(target);
            for (var i = 0, dom = null, combinedTargets = getCombinedTargets(target); i < combinedTargets.length; i++) {
                dom = combinedTargets[i];
                setBeforeMeasure(dom);
            }
            clearCombinedTargets(target); // 清除绑定
            target = null;
            dragging = null; // 禁止拖动
        };

        drawingboard.onmousedown = downCb;
        drawingboard.onmousemove = moveCb;
        drawingboard.onmouseleave = leaveCb;
        drawingboard.onmouseup = leaveCb;

        // drawingboard.ontouchstart = downCb;
        // drawingboard.ontouchmove = moveCb;
        // drawingboard.ontouchEnd = leaveCb;

        // drawingboard.addEventListener("touchstart", downCb, false);
        // drawingboard.addEventListener("touchend", moveCb, false);
        // drawingboard.addEventListener("touchmove", leaveCb, false);
    };

    Paintify.prototype = {
        paint: function paint(blocks) {
            var opt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            var blocksType = Object.prototype.toString.call(blocks);
            if (!(blocksType === '[object Array]' || blocksType === '[object NodeList]')) {
                blocks = [blocks];
            }
            var resize = opt.resize,
                move = opt.move,
                drop = opt.drop;

            var arr = [];
            for (var i = 0, block = null; i < blocks.length; i++) {
                block = blocks[i];
                // dom 不存在时
                if (!block) return;
                block.dataset.paintid = ++paintid;
                register(paintid, opt);

                if (resize && move) {
                    transformable(block);
                } else if (move) {
                    movable(block);
                }
                if (drop) {}

                if (window.getComputedStyle(block).position !== 'absolute') {
                    arr.push({
                        paintid: paintid,
                        dom: block,
                        left: block.offsetLeft,
                        top: block.offsetTop,
                        width: block.offsetWidth,
                        height: block.offsetHeight
                    });
                }
            }

            arr.map(function (item, i) {
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
                        paintid: item.paintid,
                        dom: d,
                        measureData: {
                            left: item.left,
                            top: item.top,
                            width: item.width,
                            height: item.height
                        }
                    });
                }
                // console.warn("Note:", d, "position(css) is changed into absolute");
            });
        },
        reset: function reset(target) {
            var measure = getBeforeMeasure(target);
            target.style.top = measure.top;
            target.style.left = measure.left;
            target.style.width = measure.width;
            target.style.height = measure.height;
            target.style.zIndex = measure.zIndex;
        },
        combine: function combine(target, combinedTarget) {
            var targetId = target.dataset.paintid;
            database[targetId] = database[targetId] ? database[targetId] : {};
            database[targetId]["combine"] = database[targetId]["combine"] ? database[targetId]["combine"] : [];
            database[targetId]["combine"].push(combinedTarget);
        },
        getCombined: function getCombined(target) {
            return getCombinedTargets(target);
        },
        uncombine: function uncombine(target) {
            clearCombinedTargets(target);
        }
    };

    if (typeof module !== 'undefined' && (typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object') {
        module.exports = Paintify;
    } else {
        window.Paintify = Paintify;
    }
})();