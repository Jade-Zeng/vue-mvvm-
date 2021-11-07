function toArray (s){
    try{
        return Array.prototype.slice.call(s);
    } catch(e){
        var arr = [];
        for(var i = 0,len = s.length; i < len; i++){
            arr[i] = s[i];
        }
        return arr;
    }
}
const compileUtil = {
    getVal (expr, vm) {
        return expr.split('.').reduce((data, currentVal) => {
            return data[currentVal]
        }, vm.$data)
    },
    setVal (expr, vm, inputVal) {
        return expr.split('.').reduce((data, currentVal) => {
            data[currentVal] = inputVal
        }, vm.$data)
    },
    getContentVal (expr, vm) {
       return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
           return this.getVal(args[1], vm)
       })
    },
    text (node, expr, vm) { // expr: msg value: data中的value {{}}中的文本
        // const value = this.getVal(expr, vm)
        let value
        if (expr.indexOf('{{') !== -1) { //  {{person.name}}-{{person.age}}
            value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
                // 绑定观察者，将来数据发生变化 触发这里的毁掉 进行更新
                new Watcher(vm, args[1], () => {
                    this.updater.textUpdater(node, this.getContentVal(expr, vm))
                })
                return this.getVal(args[1], vm)
            })
        } else {
            value = this.getVal(expr,vm)
        }
        this.updater.textUpdater(node, value)
    },
    html (node, expr, vm) {
        const value = this.getVal(expr, vm)
        new Watcher(vm, expr, (newVal) => {
            this.updater.htmlUpdater(node, newVal)
        })
        this.updater.htmlUpdater(node, value)
    },
    model (node, expr, vm) {
        const value = this.getVal(expr, vm)
        // 绑定更新函数 数据=> 视图
        new Watcher(vm, expr, (newVal) => {
            this.updater.modelUpdater(node, newVal)
        })
        // 视图=> 数据
        node.addEventListener('input', (e) => {
            this.setVal(expr, vm, e.target.value)
        })
        this.updater.modelUpdater(node, value)
    },
    on (node, expr, vm, eventName) {
        let fn = vm.$options.methods && vm.$options.methods[expr]
        node.addEventListener(eventName, fn.bind(vm), false)
    },
    bind (node, expr, vm) {
        const value = this.getVal(expr, vm)
        this.updater.bindUpdater(node, expr, value)
    },
    updater: {
        textUpdater (node, value) {
            node.textContent = value
        },
        htmlUpdater (node, value) {
            node.innerHTML = value
        },
        modelUpdater (node, value) {
            node.value = value
        },
        bindUpdater (node,expr, value) {
            node[expr] = value
        }
    }

}
class Compile {
    constructor(el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el)
        // console.log(this.el)
        this.vm = vm
        // 1.获取文档碎片对象 放入内存中会减少页面的重流和重绘
        const fragment = this.node2Fragment(this.el)
        // console.log(fragment)
        // 2.编译模板
        this.compile(fragment)
        // 3.追加子元素到根元素上
        this.el.appendChild(fragment)
    }
    isElementNode (node) {
        return node.nodeType === 1
    }
    node2Fragment (el) {
        // 创建文档碎片
        const f = document.createDocumentFragment()
        let firstChild
        while (firstChild = el.firstChild) {
            f.appendChild(firstChild)
        }
        return f
    }
    compile (fragment) {
        // 1.获取子节点
        const childNodes = fragment.childNodes
        toArray(childNodes).forEach(child => {
            // console.log(child)
            if (this.isElementNode(child)) {
                // 是元素节点 编译元素
                // console.log('元素节点' + child)
                this.compileElement(child)
            } else {
                // 是文本节点 编译文本
                this.compileText(child)
            }
            if (child.childNodes && child.childNodes.length ) {
                this.compile(child)
            }
        })

    }
    compileElement (node) {
        // 获取node节点上的属性
        const attr = node.attributes
        // console.log(toArray(attr))
        toArray(attr).forEach(attr => {
            const { name, value } = attr
            if (this.isDirective(name)) { // 是一个指令 v-text, v-html, v-model, v-on:click v:bind=src
                const [, directive] = name.split('-') // text, html, model, on:click
                const [dirName, eventName] = directive.split(':') // text html model, on
                // 更新数据 数据驱动视图
                compileUtil[dirName](node, value, this.vm, eventName)
                // 删除有指令的标签上的属性
                node.removeAttribute('v-' + directive)
            } else if (this.isEventName(name)) {
                const [, eventName] = name.split('@') // @click=
                // console.log(eventName)
                compileUtil['on'](node, value, this.vm, eventName)
            }

        })
    }
    compileText (node) {
        // {{}} v-text
        const content = node.textContent
        if (/\{\{(.+?)\}\}/.test(content)) {
            compileUtil['text'](node, content, this.vm)
        }

    }
    isEventName (attrName) {
        return attrName.startsWith('@')
    }
    isDirective (name) {
        return name.startsWith('v-')
    }
}
class MVue {
    constructor(options) {
        const { el, data } = options
        this.$el = el
        this.$data = data
        this.$options = options
        if (this.$el) {
            //1.实现数据观察者
            new Observer(this.$data)
            // 2.指令解析器
            new Compile(this.$el, this)
            this.proxyData(this.$data)
        }
    }
    proxyData (data) {
        for ( const key in data) {
            Object.defineProperty(this, key, {
                get () {
                   return data[key]
                },
                set (newVal) {
                    data[key] = newVal
                }
            })
        }
    }
}
