class Watcher {
    constructor(vm, expr, cb) {
        this.vm = vm
        this.expr = expr
        this.cb = cb
        // 先把旧值保存起来
        this.oldVal = this.getoldVal()
    }
    getoldVal () {
        Dep.target = this
        const oldVal = compileUtil.getVal(this.expr, this.vm)
        Dep.target = null
        return oldVal
    }
    update () {
        const newVal = compileUtil.getVal(this.expr, this.vm)
        if (newVal !== this.oldVal) {
            this.cb(newVal)
        }
    }
}
class Dep {
    constructor() {
        this.subs = []
    }
    // 收集观察者
    addDSub (watcher) {
        this.subs.push(watcher)
    }
    // 通知观察者
    notify () {
        this.subs.forEach(w=> {
            w.update()
        })
        console.log('通知', this.subs)
    }
}

class Observer {
    constructor(data) {
        this.observe(data)
    }
    observe (data) {
        // person: {
        //     name: ''
        // },
        // mag: ''
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => {
                this.defineReactive(data, key, data[key])
            })
        }
    }
    defineReactive (data, key, value) {
        this.observe(value)
        const dep = new Dep()
        // 劫持并监听所有的属性
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: false,
            get() {
                // 初始化
                // 订阅数据变化时，往dep中添加观察者
                Dep.target && dep.addDSub(Dep.target)
                return value
            },
            set: (newVal) =>  {
                this.observe(newVal)
                if (newVal !== value) {
                    value = newVal
                }
                // 告诉Dep通知变化
                dep.notify()
            }
        })
    }

}
