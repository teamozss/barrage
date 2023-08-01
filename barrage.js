
import { getVarType } from '@utils/index';
/**
 * 弹幕
 */
class Barrage {
    static styleText = `
        .vr-barrage {
            position: absolute;
            will-change: transform, opacity;
            white-space: nowrap;
            visibility: visible;
            display: inline-block;
            width: auto;
            background: #000000;
            border-radius: 11px;
            padding-right: 10px;
            box-sizing: border-box;
            opacity: 0.4
        }
        .vr-barrage img {
            display: inline-block;
            margin-right: 10px;
            vertical-align: middle;
        }
        .vr-barrage .barrage-text {
            display: inline-block;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            max-width: 100px;
            vertical-align: middle;
        }
    `;
    constructor(dom, options) {
        this.options_ = Object.assign({
            maxBarrageNum: 3, // 弹道数量
            barrageHeight: 40, // 弹幕的高度
            overTimes: 6, // 弹幕播放的时间 单位：s
            barrageSafeArea: 10,// 弹幕与弹幕的安全距离
            safeArea: 0, // 顶部安全距离
            fontSize: 18, // 默认字体大小(单位:像素)
            color: 'rgb(255, 255, 255)', // 默认字体颜色
            style: {},
        }, options);
        this.defaultOptions = {
            doms: [], // 所有 dom 节点
            channels: [], // 弹道,
        }
        this.lastRandom = null;
        if (!getVarType(dom).isHtml) {
            this.domWrap = document.getElementById(dom);
        } else {
            this.domWrap = dom;
        }
        if (!this.domWrap) { return; }
        this.insetStyleToHead();
        this.initChannel(); // 创建弹道
    }

    /**
     * 获取全局 config
     * @returns 
     */
    getOptions() { return Object.assign(this.defaultOptions, this.options_); }

    /**
     * 初始化弹道
     */
    initChannel() {
        const { maxBarrageNum } = this.getOptions();
        this.defaultOptions.channels = [];
        for (let index = 0; index < maxBarrageNum; index++) {
            this.createChannel();
        }
    }

    /**
     * 创建弹道
     */
    createChannel () {
        const { channels = [], barrageHeight = 40, safeArea = 0, barrageSafeArea } = this.getOptions();
        this.defaultOptions.channels.push({
            top: channels.length ? channels[channels.length - 1].top + barrageHeight + barrageSafeArea : safeArea,
        });
    }

    /**
     * 更新顶部安全距离
     * @param {*} safeArea 
     */
    updateSafeArea(newSafeArea) {
        const { barrageTimer, safeArea } = this.getOptions();
        const dis = newSafeArea - safeArea;
        clearTimeout(barrageTimer);
        this.options_.safeArea = newSafeArea;
        this.initChannel();
        const vrbarrageList = document.querySelectorAll('div[data-role="vr-barrage"]');
        for (let index = 0; index < vrbarrageList.length; index++) {
            const dom = vrbarrageList[index];
            const oldTop = dom.style.top.replace(/px/g, '') * 1;
            this.setStyleAndAttribute(dom, { top: oldTop + dis + "px" });
        }
        this.insertBarrageInDom();// 横竖屏变化后立即插入一条弹幕，防止等待；属于体验优化，可要可不要
        this.barrageStart();
    }

    /**
     * head 插入相关样式
     */
    insetStyleToHead() {
        const style = document.createElement('style');  //创建一个style元素
        const head = document.head || document.getElementsByTagName('head')[0];
        style.type = 'text/css';
        var textNode = document.createTextNode(Barrage.styleText);
        style.appendChild(textNode);
        head.appendChild(style);
    }
    
    /**
     * 创建dom节点
     * @param {*} temp 如： "<div class="testclass">test</div>"
     * @returns 节点node
     */
    creatElementNode(temp) {
        temp = document.createRange().createContextualFragment(temp);
        const fragmentDom = document.createDocumentFragment();
        fragmentDom.appendChild(temp);
        return fragmentDom;
    }

    /**
     * 结束动画事件
     * @param {*} e 
     */
    static handleTransitionend (e) {
        e.stopPropagation();
        e.preventDefault();
        const { left, width } = this.getBoundingClientRect();
        // 动画结束后，还未超出边界，则从此时位置重新开始动画
        if (left > 0) {
            const rate = e.target.dataset.rate; // 当前播放速率
            const needTime = (left + width) / rate; // 以当前的速率计算剩余需要的时间
            this.style.transform = `translateX(${-width - document.body.clientWidth}px)`;
            this.style.transition = `transform ${needTime}s linear`;
        } else {
            this.removeEventListener('transitionend',Barrage.handleTransitionend, false);
            this.remove();
        }
    }

    /**
     * 创建弹幕
     * @param {*} item 
     * @param {*} customStyle 
     * @returns 
     */
    createBarrageItemDom(item = {}, customStyle = {}) {
        const { fontSize, color, barrageHeight, style } = this.getOptions();
        const dom = document.createElement('div');
        const defaultImg = 'http://img.rlshijie.com/attachment_default/head_portrait/portraitv1.jpg';
        const childrenNodeStr = `<img style="width:${barrageHeight}px;height:${barrageHeight};border-radius: 100%;" class="" src=${item.src || defaultImg} /><span class="barrage-text" style="line-height:${barrageHeight}px">${item.text}</span>`;
        const childrenDom = this.creatElementNode(childrenNodeStr);
        dom.appendChild(childrenDom);
        const domAttributes = {
            'data-role': 'vr-barrage',
            'data-id': new Date().getTime(),
            class: 'vr-barrage',
        };
        const defaultStyle = {
            top: `${-barrageHeight}px`,
            color: color,
            fontSize: `${fontSize}px`,
            borderRadius: `${barrageHeight / 2}px`,
        };
        this.setStyleAndAttribute(dom, Object.assign(defaultStyle, style, customStyle), domAttributes);
        dom.addEventListener('transitionend', Barrage.handleTransitionend, false);
        return dom;
    }

    /**
     * 设置样式和属性
     * styles: 样式
     * attributes: 属性
     */
    setStyleAndAttribute(dom, styles = {}, attributes = {}) {
        for (const attr in attributes) { dom.setAttribute(attr, attributes[attr]);}
        for (const key in styles) {
            const newKey = key.replace(/([A-Z])/g, '-$1').toLowerCase(); // 驼峰命名转化
            dom.style[newKey] = styles[key];
        }
        return dom;
    }

    /**
     * 创建一条弹幕
     * @param {*} item 
     */
    createBarrage(item) {
        const { doms = [] } = this.getOptions();
        doms.unshift(this.createBarrageItemDom(item));
    }
    
    /**
     * 弹幕开始
     */
    barrageStart() {
        this.createTimeOut();
    }

    /**
     * 弹幕插入到dom中
     */
    insertBarrageInDom() {
        const { channels = [], doms = [], overTimes } = this.getOptions();
        if (doms.length) {
            const channelIndex = this.getRandomChannelIndex();
            const top = channels[channelIndex].top;
            const dom = doms[0];
            this.domWrap.appendChild(dom);
            // 设置位置和动画
            this.setStyleAndAttribute(dom, {
                top: top + 'px',
                right: -dom.clientWidth + 'px',
                transform: `translateX(${-dom.clientWidth - document.body.clientWidth}px)`,
                transition: `transform ${overTimes}s linear`,
            }, {
                'data-channel': channelIndex + 1,
                'data-rate': (dom.clientWidth + document.body.clientWidth) / overTimes,
            });
            doms.shift();
        }
    }

    /**
     * 定时器
     */
    createTimeOut() {
        const { barrageTimer } = this.getOptions();
        clearTimeout(barrageTimer);
        this.defaultOptions.barrageTimer = setTimeout(() => {
            this.defaultOptions.barrageTimer = null;
            // 如果dom还没有添加完，就继续添加
            this.insertBarrageInDom();
            this.createTimeOut();
        }, 2000);
    }

    getRandomChannelIndex() {
        const { maxBarrageNum = 3 } = this.getOptions();
        const newRandom = Math.floor(Math.random() * maxBarrageNum);
        if (newRandom == this.lastRandom) {
            return this.getRandomChannelIndex();
        } else {
            this.lastRandom = newRandom;
            return newRandom;
        }
    }

    /**
     * 清除创建的弹幕dom
     */
    clearbarrage() {
        const vrbarrageList = document.querySelectorAll('div[data-role="vr-barrage"]');
        for (let index = 0; index < vrbarrageList.length; index++) {
            vrbarrageList[index].removeEventListener('transitionend', Barrage.handleTransitionend, false);
            vrbarrageList[index].remove();
        }
    }

    /**
     * 销毁弹幕
     */
    destroy() {
        const { barrageTimer } = this.getOptions();
        clearTimeout(barrageTimer);
        this.clearbarrage();
        this.defaultOptions.barrageTimer = null;
        this.options_ = {};
        this.defaultOptions = {};
    }

}

export default Barrage;