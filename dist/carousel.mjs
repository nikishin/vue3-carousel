/**
 * Vue 3 Carousel 0.15.0
 * (c) 2025
 * @license MIT
 */
import { shallowReactive, cloneVNode, defineComponent, inject, h, reactive, ref, computed, watch, watchEffect, onMounted, onBeforeUnmount, provide, toRefs, useId, getCurrentInstance, onUnmounted, onUpdated } from 'vue';

const BREAKPOINT_MODE_OPTIONS = ['viewport', 'carousel'];
const DIR_MAP = {
    'bottom-to-top': 'btt',
    'left-to-right': 'ltr',
    'right-to-left': 'rtl',
    'top-to-bottom': 'ttb',
};
const DIR_OPTIONS = [
    'ltr',
    'left-to-right',
    'rtl',
    'right-to-left',
    'ttb',
    'top-to-bottom',
    'btt',
    'bottom-to-top',
];
const I18N_DEFAULT_CONFIG = {
    ariaGallery: 'Gallery',
    ariaNavigateToPage: 'Navigate to page {slideNumber}',
    ariaNavigateToSlide: 'Navigate to slide {slideNumber}',
    ariaNextSlide: 'Navigate to next slide',
    ariaPreviousSlide: 'Navigate to previous slide',
    iconArrowDown: 'Arrow pointing downwards',
    iconArrowLeft: 'Arrow pointing to the left',
    iconArrowRight: 'Arrow pointing to the right',
    iconArrowUp: 'Arrow pointing upwards',
    itemXofY: 'Item {currentSlide} of {slidesCount}',
};
const NORMALIZED_DIR_OPTIONS = Object.values(DIR_MAP);
const SLIDE_EFFECTS = ['slide', 'fade'];
const SNAP_ALIGN_OPTIONS = [
    'center',
    'start',
    'end',
    'center-even',
    'center-odd',
];
const DEFAULT_MOUSE_WHEEL_THRESHOLD = 10;
const DEFAULT_DRAG_THRESHOLD = 0.3;
const DEFAULT_CONFIG = {
    autoplay: 0,
    breakpointMode: BREAKPOINT_MODE_OPTIONS[0],
    breakpoints: undefined,
    dir: DIR_OPTIONS[0],
    enabled: true,
    gap: 0,
    height: 'auto',
    i18n: I18N_DEFAULT_CONFIG,
    ignoreAnimations: false,
    itemsToScroll: 1,
    itemsToShow: 1,
    modelValue: 0,
    mouseDrag: true,
    mouseWheel: false,
    pauseAutoplayOnHover: false,
    preventExcessiveDragging: false,
    slideEffect: SLIDE_EFFECTS[0],
    snapAlign: SNAP_ALIGN_OPTIONS[0],
    touchDrag: true,
    transition: 300,
    wrapAround: false,
};

// Use a symbol for inject provide to avoid any kind of collision with another lib
// https://vuejs.org/guide/components/provide-inject#working-with-symbol-keys
const injectCarousel = Symbol('carousel');

const createSlideRegistry = (emit) => {
    const slides = shallowReactive([]);
    const updateSlideIndexes = (startIndex) => {
        if (startIndex !== undefined) {
            slides.slice(startIndex).forEach((slide, offset) => {
                var _a;
                (_a = slide.exposed) === null || _a === void 0 ? void 0 : _a.setIndex(startIndex + offset);
            });
        }
        else {
            slides.forEach((slide, index) => {
                var _a;
                (_a = slide.exposed) === null || _a === void 0 ? void 0 : _a.setIndex(index);
            });
        }
    };
    return {
        cleanup: () => {
            slides.splice(0, slides.length);
        },
        getSlides: () => slides,
        registerSlide: (slide, index) => {
            if (!slide)
                return;
            if (slide.props.isClone) {
                return;
            }
            const slideIndex = index !== null && index !== void 0 ? index : slides.length;
            slides.splice(slideIndex, 0, slide);
            updateSlideIndexes(slideIndex);
            emit('slide-registered', { slide, index: slideIndex });
        },
        unregisterSlide: (slide) => {
            const slideIndex = slides.indexOf(slide);
            if (slideIndex === -1)
                return;
            emit('slide-unregistered', { slide, index: slideIndex });
            slides.splice(slideIndex, 1);
            updateSlideIndexes(slideIndex);
        },
    };
};

function calculateAverage(numbers) {
    if (numbers.length === 0)
        return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
}

function createCloneSlides({ slides, position, toShow }) {
    const clones = [];
    const isBefore = position === 'before';
    const start = isBefore ? -toShow : 0;
    const end = isBefore ? 0 : toShow;
    if (slides.length <= 0) {
        return clones;
    }
    for (let i = start; i < end; i++) {
        const index = isBefore ? i : i + slides.length;
        const props = {
            index,
            isClone: true,
            id: undefined, // Make sure we don't duplicate the id which would be invalid html
            key: `clone-${position}-${i}`,
        };
        const vnode = slides[((i % slides.length) + slides.length) % slides.length].vnode;
        const clone = cloneVNode(vnode, props);
        clone.el = null;
        clones.push(clone);
    }
    return clones;
}

const FOCUSABLE_ELEMENTS_SELECTOR = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
/**
 * Disables keyboard tab navigation for all focusable child elements
 * @param node Vue virtual node containing the elements to disable
 */
function disableChildrenTabbing(node) {
    if (!node.el || !(node.el instanceof Element)) {
        return;
    }
    const elements = node.el.querySelectorAll(FOCUSABLE_ELEMENTS_SELECTOR);
    for (const el of elements) {
        if (el instanceof HTMLElement &&
            !el.hasAttribute('disabled') &&
            el.getAttribute('aria-hidden') !== 'true') {
            el.setAttribute('tabindex', '-1');
        }
    }
}

/** Useful function to destructure props without triggering reactivity for certain keys */
function except(obj, keys) {
    return Object.keys(obj).filter((k) => !keys.includes(k))
        .reduce((acc, key) => (acc[key] = obj[key], acc), {});
}

/**
 * Calculates the number of slides to move based on drag movement
 * @param params Configuration parameters for drag calculation
 * @returns Number of slides to move (positive or negative)
 */
function getDraggedSlidesCount(params) {
    const { isVertical, isReversed, dragged, effectiveSlideSize, threshold } = params;
    // Get drag value based on direction
    const dragValue = isVertical ? dragged.y : dragged.x;
    // If no drag, return +0 explicitly
    if (dragValue === 0)
        return 0;
    const dragRatio = dragValue / effectiveSlideSize;
    const absRatio = Math.abs(dragRatio);
    // If below the threshold, consider it no movement
    if (absRatio < threshold)
        return 0;
    // For drags less than a full slide, move one slide in the drag direction
    // For drags of a full slide or more, move the corresponding number of slides
    const slidesDragged = absRatio < 1 ? Math.sign(dragRatio) : Math.round(dragRatio);
    return isReversed ? slidesDragged : -slidesDragged;
}

function getNumberInRange({ val, max, min }) {
    if (max < min) {
        return val;
    }
    return Math.min(Math.max(val, isNaN(min) ? val : min), isNaN(max) ? val : max);
}

function getTransformValues(el) {
    const { transform } = window.getComputedStyle(el);
    //add sanity check
    return transform
        .split(/[(,)]/)
        .slice(1, -1)
        .map((v) => parseFloat(v));
}
function getScaleMultipliers(transformElements) {
    let widthMultiplier = 1;
    let heightMultiplier = 1;
    transformElements.forEach((el) => {
        const transformArr = getTransformValues(el);
        if (transformArr.length === 6) {
            widthMultiplier /= transformArr[0];
            heightMultiplier /= transformArr[3];
        }
    });
    return { widthMultiplier, heightMultiplier };
}

/**
 * Calculates the snap align offset for a carousel item based on items to show.
 * Returns the number of slides to offset.
 *
 * @param align - The alignment type.
 * @param itemsToShow - The number of items to show.
 * @returns The calculated offset.
 */
function getSnapAlignOffsetByItemsToShow(align, itemsToShow) {
    switch (align) {
        case 'start':
            return 0;
        case 'center':
        case 'center-odd':
            return (itemsToShow - 1) / 2;
        case 'center-even':
            return (itemsToShow - 2) / 2;
        case 'end':
            return itemsToShow - 1;
        default:
            return 0;
    }
}
/**
 * Calculates the snap align offset for a carousel item based on slide and viewport size.
 * Returns the real width to offset.
 *
 * @param align - The alignment type.
 * @param slideSize - The size of the slide.
 * @param viewportSize - The size of the viewport.
 * @returns The calculated offset.
 */
function getSnapAlignOffsetBySlideAndViewport(align, slideSize, viewportSize) {
    switch (align) {
        case 'start':
            return 0;
        case 'center':
        case 'center-odd':
            return (viewportSize - slideSize) / 2;
        case 'center-even':
            return viewportSize / 2 - slideSize;
        case 'end':
            return viewportSize - slideSize;
        default:
            return 0;
    }
}
/**
 * Calculates the snap align offset for a carousel item.
 *
 * @param params - The parameters for calculating the offset.
 * @returns The calculated offset.
 */
function getSnapAlignOffset({ slideSize, viewportSize, align, itemsToShow, }) {
    if (itemsToShow !== undefined) {
        return getSnapAlignOffsetByItemsToShow(align, itemsToShow);
    }
    if (slideSize !== undefined && viewportSize !== undefined) {
        return getSnapAlignOffsetBySlideAndViewport(align, slideSize, viewportSize);
    }
    return 0;
}

function i18nFormatter(string = '', values = {}) {
    return Object.entries(values).reduce((acc, [key, value]) => acc.replace(`{${key}}`, String(value)), string);
}

function mapNumberToRange({ val, max, min = 0 }) {
    const mod = max - min + 1;
    return ((((val - min) % mod) + mod) % mod) + min;
}

/**
 * Returns a throttled version of the function using requestAnimationFrame.
 *
 * @param fn - The function to throttle.
 * @param ms - The number of milliseconds to wait for the throttled function to be called again
 */
function throttle(fn, ms = 0) {
    let isThrottled = false;
    let start = 0;
    let frameId = null;
    function throttled(...args) {
        if (isThrottled)
            return;
        isThrottled = true;
        const step = () => {
            frameId = requestAnimationFrame((time) => {
                const elapsed = time - start;
                if (elapsed > ms) {
                    start = time;
                    fn(...args);
                    isThrottled = false;
                }
                else {
                    step();
                }
            });
        };
        step();
    }
    throttled.cancel = () => {
        if (frameId) {
            cancelAnimationFrame(frameId);
            frameId = null;
            isThrottled = false;
        }
    };
    return throttled;
}

/**
 * Converts a value to a CSS-compatible string.
 * @param value - The value to convert.
 * @returns The CSS-compatible string.
 **/
function toCssValue(value, unit = 'px') {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    if (typeof value === 'number' || parseFloat(value).toString() === value) {
        return `${value}${unit}`;
    }
    return value;
}

const ARIA = defineComponent({
    name: 'CarouselAria',
    setup() {
        const carousel = inject(injectCarousel);
        if (!carousel) {
            return () => '';
        }
        return () => h('div', {
            class: ['carousel__liveregion', 'carousel__sr-only'],
            'aria-live': 'polite',
            'aria-atomic': 'true',
        }, i18nFormatter(carousel.config.i18n['itemXofY'], {
            currentSlide: carousel.currentSlide + 1,
            slidesCount: carousel.slidesCount,
        }));
    },
});

function useDrag(options) {
    let isTouch = false;
    const startPosition = { x: 0, y: 0 };
    const dragged = reactive({ x: 0, y: 0 });
    const isDragging = ref(false);
    const { isSliding } = options;
    const sliding = computed(() => {
        return typeof isSliding === 'boolean' ? isSliding : isSliding.value;
    });
    const handleDragStart = (event) => {
        var _a;
        // Prevent drag initiation on input elements or if already sliding
        const targetTagName = event.target.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTagName) || sliding.value) {
            return;
        }
        isTouch = event.type === 'touchstart';
        if (!isTouch) {
            event.preventDefault();
            if (event.button !== 0) {
                return;
            }
        }
        startPosition.x = isTouch
            ? event.touches[0].clientX
            : event.clientX;
        startPosition.y = isTouch
            ? event.touches[0].clientY
            : event.clientY;
        const moveEvent = isTouch ? 'touchmove' : 'mousemove';
        const endEvent = isTouch ? 'touchend' : 'mouseup';
        document.addEventListener(moveEvent, handleDrag, { passive: false });
        document.addEventListener(endEvent, handleDragEnd, { passive: true });
        (_a = options.onDragStart) === null || _a === void 0 ? void 0 : _a.call(options);
    };
    const handleDrag = throttle((event) => {
        var _a;
        isDragging.value = true;
        const currentX = isTouch
            ? event.touches[0].clientX
            : event.clientX;
        const currentY = isTouch
            ? event.touches[0].clientY
            : event.clientY;
        dragged.x = currentX - startPosition.x;
        dragged.y = currentY - startPosition.y;
        (_a = options.onDrag) === null || _a === void 0 ? void 0 : _a.call(options, { deltaX: dragged.x, deltaY: dragged.y, isTouch });
    });
    const handleDragEnd = () => {
        var _a;
        handleDrag.cancel();
        if (!isTouch) {
            const preventClick = (e) => {
                e.preventDefault();
                window.removeEventListener('click', preventClick);
            };
            window.addEventListener('click', preventClick);
        }
        (_a = options.onDragEnd) === null || _a === void 0 ? void 0 : _a.call(options);
        dragged.x = 0;
        dragged.y = 0;
        isDragging.value = false;
        const moveEvent = isTouch ? 'touchmove' : 'mousemove';
        const endEvent = isTouch ? 'touchend' : 'mouseup';
        document.removeEventListener(moveEvent, handleDrag);
        document.removeEventListener(endEvent, handleDragEnd);
    };
    return {
        dragged,
        isDragging,
        handleDragStart,
    };
}

function useHover() {
    const isHover = ref(false);
    const handleMouseEnter = () => {
        isHover.value = true;
    };
    const handleMouseLeave = () => {
        isHover.value = false;
    };
    return {
        isHover,
        handleMouseEnter,
        handleMouseLeave,
    };
}

function useWheel(options) {
    const { isVertical, isSliding, config } = options;
    // Create computed values to handle both reactive and non-reactive inputs
    const vertical = computed(() => {
        return typeof isVertical === 'boolean' ? isVertical : isVertical.value;
    });
    const sliding = computed(() => {
        return typeof isSliding === 'boolean' ? isSliding : isSliding.value;
    });
    const handleScroll = (event) => {
        var _a, _b;
        event.preventDefault();
        if (!config.mouseWheel || sliding.value) {
            return;
        }
        // Add sensitivity threshold to prevent small movements from triggering navigation
        const threshold = typeof config.mouseWheel === 'object'
            ? ((_a = config.mouseWheel.threshold) !== null && _a !== void 0 ? _a : DEFAULT_MOUSE_WHEEL_THRESHOLD)
            : DEFAULT_MOUSE_WHEEL_THRESHOLD;
        // Determine scroll direction
        const deltaY = Math.abs(event.deltaY) > threshold ? event.deltaY : 0;
        const deltaX = Math.abs(event.deltaX) > threshold ? event.deltaX : 0;
        // If neither delta exceeds the threshold, don't navigate
        if (deltaY === 0 && deltaX === 0) {
            return;
        }
        // Determine primary delta based on carousel orientation
        const primaryDelta = vertical.value ? deltaY : deltaX;
        // If primaryDelta is 0, use the other delta as fallback
        const effectiveDelta = primaryDelta !== 0 ? primaryDelta : vertical.value ? deltaX : deltaY;
        // Positive delta means scrolling down/right
        const isScrollingForward = effectiveDelta > 0;
        (_b = options.onWheel) === null || _b === void 0 ? void 0 : _b.call(options, { deltaX, deltaY, isScrollingForward });
    };
    return {
        handleScroll,
    };
}

const carouselProps = {
    // time to auto advance slides in ms
    autoplay: {
        default: DEFAULT_CONFIG.autoplay,
        type: Number,
    },
    // an object to store breakpoints
    breakpoints: {
        default: DEFAULT_CONFIG.breakpoints,
        type: Object,
    },
    // controls the breakpoint mode relative to the carousel container or the viewport
    breakpointMode: {
        default: DEFAULT_CONFIG.breakpointMode,
        validator(value) {
            return BREAKPOINT_MODE_OPTIONS.includes(value);
        },
    },
    clamp: {
        type: Boolean,
    },
    // control the direction of the carousel
    dir: {
        type: String,
        default: DEFAULT_CONFIG.dir,
        validator(value, props) {
            // The value must match one of these strings
            if (!DIR_OPTIONS.includes(value)) {
                return false;
            }
            const normalizedDir = value in DIR_MAP ? DIR_MAP[value] : value;
            if (['ttb', 'btt'].includes(normalizedDir) &&
                (!props.height || props.height === 'auto')) {
                console.warn(`[vue3-carousel]: The dir "${value}" is not supported with height "auto".`);
            }
            return true;
        },
    },
    // enable/disable the carousel component
    enabled: {
        default: DEFAULT_CONFIG.enabled,
        type: Boolean,
    },
    // control the gap between slides
    gap: {
        default: DEFAULT_CONFIG.gap,
        type: Number,
    },
    // set carousel height
    height: {
        default: DEFAULT_CONFIG.height,
        type: [Number, String],
    },
    // aria-labels and additional text labels
    i18n: {
        default: DEFAULT_CONFIG.i18n,
        type: Object,
    },
    ignoreAnimations: {
        default: false,
        type: [Array, Boolean, String],
    },
    // count of items to be scrolled
    itemsToScroll: {
        default: DEFAULT_CONFIG.itemsToScroll,
        type: Number,
    },
    // count of items to showed per view
    itemsToShow: {
        default: DEFAULT_CONFIG.itemsToShow,
        type: [Number, String],
    },
    // slide number number of initial slide
    modelValue: {
        default: undefined,
        type: Number,
    },
    // toggle mouse dragging
    mouseDrag: {
        default: DEFAULT_CONFIG.mouseDrag,
        type: [Boolean, Object],
    },
    // toggle mouse wheel scrolling
    mouseWheel: {
        default: DEFAULT_CONFIG.mouseWheel,
        type: [Boolean, Object],
    },
    // control mouse scroll threshold
    mouseScrollThreshold: {
        default: DEFAULT_CONFIG.mouseScrollThreshold,
        type: Number,
    },
    pauseAutoplayOnHover: {
        default: DEFAULT_CONFIG.pauseAutoplayOnHover,
        type: Boolean,
    },
    preventExcessiveDragging: {
        default: false,
        type: Boolean,
        validator(value, props) {
            if (value && props.wrapAround) {
                console.warn(`[vue3-carousel]: "preventExcessiveDragging" cannot be used with wrapAround. The setting will be ignored.`);
            }
            return true;
        },
    },
    slideEffect: {
        type: String,
        default: DEFAULT_CONFIG.slideEffect,
        validator(value) {
            return SLIDE_EFFECTS.includes(value);
        },
    },
    // control snap position alignment
    snapAlign: {
        default: DEFAULT_CONFIG.snapAlign,
        validator(value) {
            return SNAP_ALIGN_OPTIONS.includes(value);
        },
    },
    // toggle touch dragging
    touchDrag: {
        default: DEFAULT_CONFIG.touchDrag,
        type: [Boolean, Object],
    },
    // sliding transition time in ms
    transition: {
        default: DEFAULT_CONFIG.transition,
        type: Number,
    },
    // control infinite scrolling mode
    wrapAround: {
        default: DEFAULT_CONFIG.wrapAround,
        type: Boolean,
    },
};

const Carousel = defineComponent({
    name: 'VueCarousel',
    props: carouselProps,
    emits: [
        'before-init',
        'drag',
        'init',
        'loop',
        'slide-end',
        'slide-registered',
        'slide-start',
        'slide-unregistered',
        'update:modelValue',
        'wheel',
    ],
    setup(props, { slots, emit, expose }) {
        var _a;
        const slideRegistry = createSlideRegistry(emit);
        const slides = slideRegistry.getSlides();
        const slidesCount = computed(() => slides.length);
        const root = ref(null);
        const viewport = ref(null);
        const slideSize = ref(0);
        const fallbackConfig = computed(() => (Object.assign(Object.assign(Object.assign({}, DEFAULT_CONFIG), except(props, ['breakpoints', 'modelValue'])), { i18n: Object.assign(Object.assign({}, DEFAULT_CONFIG.i18n), props.i18n) })));
        // current active config
        const config = shallowReactive(Object.assign({}, fallbackConfig.value));
        // slides
        const currentSlideIndex = ref((_a = props.modelValue) !== null && _a !== void 0 ? _a : 0);
        const activeSlideIndex = ref(currentSlideIndex.value);
        watch(currentSlideIndex, (val) => (activeSlideIndex.value = val));
        const prevSlideIndex = ref(0);
        const middleSlideIndex = computed(() => Math.ceil((slidesCount.value - 1) / 2));
        const maxSlideIndex = computed(() => slidesCount.value - 1);
        const minSlideIndex = computed(() => 0);
        let autoplayTimer = null;
        let transitionTimer = null;
        let resizeObserver = null;
        const effectiveSlideSize = computed(() => slideSize.value + config.gap);
        const normalizedDir = computed(() => {
            const dir = config.dir || 'ltr';
            return dir in DIR_MAP ? DIR_MAP[dir] : dir;
        });
        const isReversed = computed(() => ['rtl', 'btt'].includes(normalizedDir.value));
        const isVertical = computed(() => ['ttb', 'btt'].includes(normalizedDir.value));
        const isAuto = computed(() => config.itemsToShow === 'auto');
        const dimension = computed(() => (isVertical.value ? 'height' : 'width'));
        function updateBreakpointsConfig() {
            var _a;
            if (!mounted.value) {
                return;
            }
            // Determine the width source based on the 'breakpointMode' config
            const widthSource = (fallbackConfig.value.breakpointMode === 'carousel'
                ? (_a = root.value) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect().width
                : typeof window !== 'undefined'
                    ? window.innerWidth
                    : 0) || 0;
            const breakpointsArray = Object.keys(props.breakpoints || {})
                .map((key) => Number(key))
                .sort((a, b) => +b - +a);
            const newConfig = {};
            breakpointsArray.some((breakpoint) => {
                if (widthSource >= breakpoint) {
                    Object.assign(newConfig, props.breakpoints[breakpoint]);
                    if (newConfig.i18n) {
                        Object.assign(newConfig.i18n, fallbackConfig.value.i18n, props.breakpoints[breakpoint].i18n);
                    }
                    return true;
                }
                return false;
            });
            Object.assign(config, fallbackConfig.value, newConfig);
            // Validate itemsToShow
            if (!isAuto.value) {
                config.itemsToShow = getNumberInRange({
                    val: Number(config.itemsToShow),
                    max: props.clamp ? slidesCount.value : Infinity,
                    min: 1,
                });
            }
        }
        const handleResize = throttle(() => {
            updateBreakpointsConfig();
            updateSlidesData();
            updateSlideSize();
        });
        const transformElements = shallowReactive(new Set());
        /**
         * Setup functions
         */
        const slidesRect = ref([]);
        function updateSlidesRectSize({ widthMultiplier, heightMultiplier, }) {
            slidesRect.value = slides.map((slide) => {
                var _a;
                const rect = (_a = slide.exposed) === null || _a === void 0 ? void 0 : _a.getBoundingRect();
                return {
                    width: rect.width * widthMultiplier,
                    height: rect.height * heightMultiplier,
                };
            });
        }
        const viewportRect = ref({
            width: 0,
            height: 0,
        });
        function updateViewportRectSize({ widthMultiplier, heightMultiplier, }) {
            var _a;
            const rect = ((_a = viewport.value) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect()) || { width: 0, height: 0 };
            viewportRect.value = {
                width: rect.width * widthMultiplier,
                height: rect.height * heightMultiplier,
            };
        }
        function updateSlideSize() {
            if (!viewport.value)
                return;
            const scaleMultipliers = getScaleMultipliers(transformElements);
            updateViewportRectSize(scaleMultipliers);
            updateSlidesRectSize(scaleMultipliers);
            if (isAuto.value) {
                slideSize.value = calculateAverage(slidesRect.value.map((slide) => slide[dimension.value]));
            }
            else {
                const itemsToShow = Number(config.itemsToShow);
                const totalGap = (itemsToShow - 1) * config.gap;
                slideSize.value = (viewportRect.value[dimension.value] - totalGap) / itemsToShow;
            }
        }
        function updateSlidesData() {
            if (!config.wrapAround && slidesCount.value > 0) {
                currentSlideIndex.value = getNumberInRange({
                    val: currentSlideIndex.value,
                    max: maxSlideIndex.value,
                    min: minSlideIndex.value,
                });
            }
        }
        const ignoreAnimations = computed(() => {
            if (typeof props.ignoreAnimations === 'string') {
                return props.ignoreAnimations.split(',');
            }
            else if (Array.isArray(props.ignoreAnimations)) {
                return props.ignoreAnimations;
            }
            else if (!props.ignoreAnimations) {
                return [];
            }
            return false;
        });
        watchEffect(() => updateSlidesData());
        watchEffect(() => {
            // Call updateSlideSize when viewport is ready and track deps
            updateSlideSize();
        });
        let animationInterval;
        const setAnimationInterval = (event) => {
            const target = event.target;
            if (!(target === null || target === void 0 ? void 0 : target.contains(root.value)) ||
                (Array.isArray(ignoreAnimations.value) &&
                    ignoreAnimations.value.includes(event.animationName))) {
                return;
            }
            transformElements.add(target);
            if (!animationInterval) {
                const stepAnimation = () => {
                    animationInterval = requestAnimationFrame(() => {
                        updateSlideSize();
                        stepAnimation();
                    });
                };
                stepAnimation();
            }
        };
        const finishAnimation = (event) => {
            const target = event.target;
            if (target) {
                transformElements.delete(target);
            }
            if (animationInterval && transformElements.size === 0) {
                cancelAnimationFrame(animationInterval);
                updateSlideSize();
            }
        };
        const mounted = ref(false);
        if (typeof document !== 'undefined') {
            watchEffect(() => {
                if (mounted.value && ignoreAnimations.value !== false) {
                    document.addEventListener('animationstart', setAnimationInterval);
                    document.addEventListener('animationend', finishAnimation);
                }
                else {
                    document.removeEventListener('animationstart', setAnimationInterval);
                    document.removeEventListener('animationend', finishAnimation);
                }
            });
        }
        onMounted(() => {
            mounted.value = true;
            updateBreakpointsConfig();
            initAutoplay();
            if (root.value) {
                resizeObserver = new ResizeObserver(handleResize);
                resizeObserver.observe(root.value);
            }
            emit('init');
        });
        onBeforeUnmount(() => {
            mounted.value = false;
            slideRegistry.cleanup();
            if (transitionTimer) {
                clearTimeout(transitionTimer);
            }
            if (animationInterval) {
                cancelAnimationFrame(animationInterval);
            }
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
            }
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }
            if (typeof document !== 'undefined') {
                handleBlur();
            }
            if (root.value) {
                root.value.removeEventListener('transitionend', updateSlideSize);
                root.value.removeEventListener('animationiteration', updateSlideSize);
            }
        });
        /**
         * Carousel Event listeners
         */
        const { isHover, handleMouseEnter, handleMouseLeave } = useHover();
        const handleArrowKeys = throttle((event) => {
            if (event.ctrlKey)
                return;
            switch (event.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    if (isVertical.value === event.key.endsWith('Up')) {
                        if (isReversed.value) {
                            next(true);
                        }
                        else {
                            prev(true);
                        }
                    }
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    if (isVertical.value === event.key.endsWith('Down')) {
                        if (isReversed.value) {
                            prev(true);
                        }
                        else {
                            next(true);
                        }
                    }
                    break;
            }
        }, 200);
        const handleBlur = () => {
            document.removeEventListener('keydown', handleArrowKeys);
        };
        const handleFocus = () => {
            document.addEventListener('keydown', handleArrowKeys);
        };
        /**
         * Autoplay
         */
        function initAutoplay() {
            if (!config.autoplay || config.autoplay <= 0) {
                return;
            }
            autoplayTimer = setInterval(() => {
                if (config.pauseAutoplayOnHover && isHover.value) {
                    return;
                }
                next();
            }, config.autoplay);
        }
        function resetAutoplay() {
            stopAutoplay();
            initAutoplay();
        }
        function stopAutoplay() {
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        }
        /**
         * Navigation function
         */
        const isSliding = ref(false);
        const onDrag = ({ deltaX, deltaY, isTouch }) => {
            var _a, _b, _c, _d;
            emit('drag', { deltaX, deltaY });
            const threshold = isTouch
                ? typeof config.touchDrag === 'object'
                    ? ((_b = (_a = config.touchDrag) === null || _a === void 0 ? void 0 : _a.threshold) !== null && _b !== void 0 ? _b : DEFAULT_DRAG_THRESHOLD)
                    : DEFAULT_DRAG_THRESHOLD
                : typeof config.mouseDrag === 'object'
                    ? ((_d = (_c = config.mouseDrag) === null || _c === void 0 ? void 0 : _c.threshold) !== null && _d !== void 0 ? _d : DEFAULT_DRAG_THRESHOLD)
                    : DEFAULT_DRAG_THRESHOLD;
            const draggedSlides = getDraggedSlidesCount({
                isVertical: isVertical.value,
                isReversed: isReversed.value,
                dragged: { x: deltaX, y: deltaY },
                effectiveSlideSize: effectiveSlideSize.value,
                threshold,
            });
            activeSlideIndex.value = config.wrapAround
                ? currentSlideIndex.value + draggedSlides
                : getNumberInRange({
                    val: currentSlideIndex.value + draggedSlides,
                    max: maxSlideIndex.value,
                    min: minSlideIndex.value,
                });
        };
        const onDragEnd = () => slideTo(activeSlideIndex.value);
        const { dragged, isDragging, handleDragStart } = useDrag({
            isSliding,
            onDrag,
            onDragEnd,
        });
        const onWheel = ({ deltaX, deltaY, isScrollingForward }) => {
            emit('wheel', { deltaX, deltaY });
            if (isScrollingForward) {
                // Scrolling down/right
                if (isReversed.value) {
                    prev();
                }
                else {
                    next();
                }
            }
            else {
                // Scrolling up/left
                if (isReversed.value) {
                    next();
                }
                else {
                    prev();
                }
            }
        };
        const { handleScroll } = useWheel({
            isVertical,
            isSliding,
            config,
            onWheel,
        });
        function next(skipTransition = false) {
            slideTo(currentSlideIndex.value + config.itemsToScroll, skipTransition);
        }
        function prev(skipTransition = false) {
            slideTo(currentSlideIndex.value - config.itemsToScroll, skipTransition);
        }
        function slideTo(slideIndex, skipTransition = false) {
            if (!skipTransition && isSliding.value) {
                return;
            }
            let targetIndex = slideIndex;
            let mappedIndex = slideIndex;
            prevSlideIndex.value = currentSlideIndex.value;
            if (!config.wrapAround) {
                targetIndex = getNumberInRange({
                    val: targetIndex,
                    max: maxSlideIndex.value,
                    min: minSlideIndex.value,
                });
            }
            else {
                mappedIndex = mapNumberToRange({
                    val: targetIndex,
                    max: maxSlideIndex.value,
                    min: minSlideIndex.value,
                });
            }
            emit('slide-start', {
                slidingToIndex: slideIndex,
                currentSlideIndex: currentSlideIndex.value,
                prevSlideIndex: prevSlideIndex.value,
                slidesCount: slidesCount.value,
            });
            stopAutoplay();
            isSliding.value = true;
            currentSlideIndex.value = targetIndex;
            if (mappedIndex !== targetIndex) {
                modelWatcher.pause();
            }
            emit('update:modelValue', mappedIndex);
            const transitionCallback = () => {
                if (config.wrapAround && mappedIndex !== targetIndex) {
                    modelWatcher.resume();
                    currentSlideIndex.value = mappedIndex;
                    emit('loop', {
                        currentSlideIndex: currentSlideIndex.value,
                        slidingToIndex: slideIndex,
                    });
                }
                emit('slide-end', {
                    currentSlideIndex: currentSlideIndex.value,
                    prevSlideIndex: prevSlideIndex.value,
                    slidesCount: slidesCount.value,
                });
                isSliding.value = false;
                resetAutoplay();
            };
            transitionTimer = setTimeout(transitionCallback, config.transition);
        }
        function restartCarousel() {
            updateBreakpointsConfig();
            updateSlidesData();
            updateSlideSize();
            resetAutoplay();
        }
        // Update the carousel on props change
        watch(() => [fallbackConfig.value, props.breakpoints], () => updateBreakpointsConfig(), { deep: true });
        watch(() => props.autoplay, () => resetAutoplay());
        // Handle changing v-model value
        const modelWatcher = watch(() => props.modelValue, (val) => {
            if (val === currentSlideIndex.value) {
                return;
            }
            slideTo(Number(val), true);
        });
        // Init carousel
        emit('before-init');
        const clonedSlidesCount = computed(() => {
            if (!config.wrapAround) {
                return { before: 0, after: 0 };
            }
            if (isAuto.value) {
                return { before: slides.length, after: slides.length };
            }
            const itemsToShow = Number(config.itemsToShow);
            const slidesToClone = Math.ceil(itemsToShow + (config.itemsToScroll - 1));
            const before = slidesToClone - activeSlideIndex.value;
            const after = slidesToClone - (slidesCount.value - (activeSlideIndex.value + 1));
            return {
                before: Math.max(0, before),
                after: Math.max(0, after),
            };
        });
        const clonedSlidesOffset = computed(() => {
            if (!clonedSlidesCount.value.before) {
                return 0;
            }
            if (isAuto.value) {
                return (slidesRect.value
                    .slice(-1 * clonedSlidesCount.value.before)
                    .reduce((acc, slide) => acc + slide[dimension.value] + config.gap, 0) * -1);
            }
            return clonedSlidesCount.value.before * effectiveSlideSize.value * -1;
        });
        const snapAlignOffset = computed(() => {
            var _a;
            if (isAuto.value) {
                const slideIndex = ((currentSlideIndex.value % slides.length) + slides.length) % slides.length;
                return getSnapAlignOffset({
                    slideSize: (_a = slidesRect.value[slideIndex]) === null || _a === void 0 ? void 0 : _a[dimension.value],
                    viewportSize: viewportRect.value[dimension.value],
                    align: config.snapAlign,
                });
            }
            return getSnapAlignOffset({
                align: config.snapAlign,
                itemsToShow: +config.itemsToShow,
            });
        });
        const scrolledOffset = computed(() => {
            let output = 0;
            if (isAuto.value) {
                if (currentSlideIndex.value < 0) {
                    output =
                        slidesRect.value
                            .slice(currentSlideIndex.value)
                            .reduce((acc, slide) => acc + slide[dimension.value] + config.gap, 0) * -1;
                }
                else {
                    output = slidesRect.value
                        .slice(0, currentSlideIndex.value)
                        .reduce((acc, slide) => acc + slide[dimension.value] + config.gap, 0);
                }
                output -= snapAlignOffset.value;
                // remove whitespace
                if (!config.wrapAround) {
                    const maxSlidingValue = slidesRect.value.reduce((acc, slide) => acc + slide[dimension.value] + config.gap, 0) -
                        viewportRect.value[dimension.value] -
                        config.gap;
                    output = getNumberInRange({
                        val: output,
                        max: maxSlidingValue,
                        min: 0,
                    });
                }
            }
            else {
                let scrolledSlides = currentSlideIndex.value - snapAlignOffset.value;
                // remove whitespace
                if (!config.wrapAround) {
                    scrolledSlides = getNumberInRange({
                        val: scrolledSlides,
                        max: slidesCount.value - +config.itemsToShow,
                        min: 0,
                    });
                }
                output = scrolledSlides * effectiveSlideSize.value;
            }
            return output * (isReversed.value ? 1 : -1);
        });
        const visibleRange = computed(() => {
            var _a, _b;
            if (!isAuto.value) {
                const base = currentSlideIndex.value - snapAlignOffset.value;
                if (config.wrapAround) {
                    return {
                        min: Math.floor(base),
                        max: Math.ceil(base + Number(config.itemsToShow) - 1),
                    };
                }
                return {
                    min: Math.floor(getNumberInRange({
                        val: base,
                        max: slidesCount.value - Number(config.itemsToShow),
                        min: 0,
                    })),
                    max: Math.ceil(getNumberInRange({
                        val: base + Number(config.itemsToShow) - 1,
                        max: slidesCount.value - 1,
                        min: 0,
                    })),
                };
            }
            // Auto width mode
            let minIndex = 0;
            {
                let accumulatedSize = 0;
                let index = 0 - clonedSlidesCount.value.before;
                const offset = Math.abs(scrolledOffset.value + clonedSlidesOffset.value);
                while (accumulatedSize <= offset) {
                    const normalizedIndex = ((index % slides.length) + slides.length) % slides.length;
                    accumulatedSize +=
                        ((_a = slidesRect.value[normalizedIndex]) === null || _a === void 0 ? void 0 : _a[dimension.value]) + config.gap;
                    index++;
                }
                minIndex = index - 1;
            }
            let maxIndex = 0;
            {
                let index = minIndex;
                let accumulatedSize = 0;
                if (index < 0) {
                    accumulatedSize =
                        slidesRect.value
                            .slice(0, index)
                            .reduce((acc, slide) => acc + slide[dimension.value] + config.gap, 0) -
                            Math.abs(scrolledOffset.value + clonedSlidesOffset.value);
                }
                else {
                    accumulatedSize =
                        slidesRect.value
                            .slice(0, index)
                            .reduce((acc, slide) => acc + slide[dimension.value] + config.gap, 0) -
                            Math.abs(scrolledOffset.value);
                }
                while (accumulatedSize < viewportRect.value[dimension.value]) {
                    const normalizedIndex = ((index % slides.length) + slides.length) % slides.length;
                    accumulatedSize +=
                        ((_b = slidesRect.value[normalizedIndex]) === null || _b === void 0 ? void 0 : _b[dimension.value]) + config.gap;
                    index++;
                }
                maxIndex = index - 1;
            }
            return {
                min: Math.floor(minIndex),
                max: Math.ceil(maxIndex),
            };
        });
        const trackTransform = computed(() => {
            if (config.slideEffect === 'fade') {
                return undefined;
            }
            const translateAxis = isVertical.value ? 'Y' : 'X';
            // Include user drag interaction offset
            const dragOffset = isVertical.value ? dragged.y : dragged.x;
            let totalOffset = scrolledOffset.value + dragOffset;
            if (!config.wrapAround && config.preventExcessiveDragging) {
                let maxSlidingValue = 0;
                if (isAuto.value) {
                    maxSlidingValue = slidesRect.value.reduce((acc, slide) => acc + slide[dimension.value], 0);
                }
                else {
                    maxSlidingValue =
                        (slidesCount.value - Number(config.itemsToShow)) * effectiveSlideSize.value;
                }
                const min = isReversed.value ? 0 : -1 * maxSlidingValue;
                const max = isReversed.value ? maxSlidingValue : 0;
                totalOffset = getNumberInRange({
                    val: totalOffset,
                    min,
                    max,
                });
            }
            return `translate${translateAxis}(${totalOffset}px)`;
        });
        const carouselStyle = computed(() => ({
            '--vc-carousel-height': toCssValue(config.height),
            '--vc-cloned-offset': toCssValue(clonedSlidesOffset.value),
            '--vc-slide-gap': toCssValue(config.gap),
            '--vc-transition-duration': isSliding.value
                ? toCssValue(config.transition, 'ms')
                : undefined,
        }));
        const nav = { slideTo, next, prev };
        const provided = reactive({
            activeSlide: activeSlideIndex,
            config,
            currentSlide: currentSlideIndex,
            isSliding,
            isVertical,
            maxSlide: maxSlideIndex,
            minSlide: minSlideIndex,
            nav,
            normalizedDir,
            slideRegistry,
            slideSize,
            slides,
            slidesCount,
            viewport,
            visibleRange,
        });
        provide(injectCarousel, provided);
        const data = reactive({
            config,
            currentSlide: currentSlideIndex,
            maxSlide: maxSlideIndex,
            middleSlide: middleSlideIndex,
            minSlide: minSlideIndex,
            slideSize,
            slidesCount,
        });
        expose(reactive(Object.assign({ data,
            next,
            prev,
            restartCarousel,
            slideTo,
            updateBreakpointsConfig,
            updateSlideSize,
            updateSlidesData }, toRefs(provided))));
        return () => {
            var _a;
            const slotSlides = slots.default || slots.slides;
            const outputSlides = (slotSlides === null || slotSlides === void 0 ? void 0 : slotSlides(data)) || [];
            const { before, after } = clonedSlidesCount.value;
            const slidesBefore = createCloneSlides({
                slides,
                position: 'before',
                toShow: before,
            });
            const slidesAfter = createCloneSlides({
                slides,
                position: 'after',
                toShow: after,
            });
            const output = [...slidesBefore, ...outputSlides, ...slidesAfter];
            if (!config.enabled || !output.length) {
                return h('section', {
                    ref: root,
                    class: ['carousel', 'is-disabled'],
                }, output);
            }
            const addonsElements = ((_a = slots.addons) === null || _a === void 0 ? void 0 : _a.call(slots, data)) || [];
            const trackEl = h('ol', {
                class: 'carousel__track',
                onMousedownCapture: config.mouseDrag ? handleDragStart : null,
                onTouchstartPassiveCapture: config.touchDrag ? handleDragStart : null,
                onWheel: config.mouseWheel ? handleScroll : null,
                style: { transform: trackTransform.value },
            }, output);
            const viewPortEl = h('div', { class: 'carousel__viewport', ref: viewport }, trackEl);
            return h('section', {
                ref: root,
                class: [
                    'carousel',
                    `is-${normalizedDir.value}`,
                    `is-effect-${config.slideEffect}`,
                    {
                        'is-dragging': isDragging.value,
                        'is-hover': isHover.value,
                        'is-sliding': isSliding.value,
                        'is-vertical': isVertical.value,
                    },
                ],
                dir: normalizedDir.value,
                style: carouselStyle.value,
                'aria-label': config.i18n['ariaGallery'],
                tabindex: '0',
                onBlur: handleBlur,
                onFocus: handleFocus,
                onMouseenter: handleMouseEnter,
                onMouseleave: handleMouseLeave,
            }, [viewPortEl, addonsElements, h(ARIA)]);
        };
    },
});

var IconName;
(function (IconName) {
    IconName["arrowDown"] = "arrowDown";
    IconName["arrowLeft"] = "arrowLeft";
    IconName["arrowRight"] = "arrowRight";
    IconName["arrowUp"] = "arrowUp";
})(IconName || (IconName = {}));

const iconI18n = (name) => `icon${name.charAt(0).toUpperCase() + name.slice(1)}`;
const icons = {
    arrowDown: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
    arrowLeft: 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z',
    arrowRight: 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z',
    arrowUp: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
};
function isIconName(candidate) {
    return candidate in IconName;
}
const validateIconName = (value) => {
    return value && isIconName(value);
};
const Icon = defineComponent({
    props: {
        name: {
            type: String,
            required: true,
            validator: validateIconName,
        },
        title: {
            type: String,
            default: (props) => props.name ? DEFAULT_CONFIG.i18n[iconI18n(props.name)] : '',
        },
    },
    setup(props) {
        const carousel = inject(injectCarousel, null);
        return () => {
            const iconName = props.name;
            if (!iconName || !validateIconName(iconName))
                return;
            const path = icons[iconName];
            const pathEl = h('path', { d: path });
            const iconTitle = (carousel === null || carousel === void 0 ? void 0 : carousel.config.i18n[iconI18n(iconName)]) || props.title;
            const titleEl = h('title', iconTitle);
            return h('svg', {
                class: 'carousel__icon',
                viewBox: '0 0 24 24',
                role: 'img',
                'aria-label': iconTitle,
            }, [titleEl, pathEl]);
        };
    },
});

const Navigation = defineComponent({
    name: 'CarouselNavigation',
    inheritAttrs: false,
    props: {
        carousel: {
            type: Object,
        },
    },
    setup(props, { slots, attrs }) {
        let carousel = inject(injectCarousel, null);
        const { next: slotNext, prev: slotPrev } = slots;
        const getPrevIcon = () => {
            const directionIcons = {
                btt: 'arrowDown',
                ltr: 'arrowLeft',
                rtl: 'arrowRight',
                ttb: 'arrowUp',
            };
            return directionIcons[carousel.normalizedDir];
        };
        const getNextIcon = () => {
            const directionIcons = {
                btt: 'arrowUp',
                ltr: 'arrowRight',
                rtl: 'arrowLeft',
                ttb: 'arrowDown',
            };
            return directionIcons[carousel.normalizedDir];
        };
        const prevDisabled = computed(() => !carousel.config.wrapAround && carousel.currentSlide <= carousel.minSlide);
        const nextDisabled = computed(() => !carousel.config.wrapAround && carousel.currentSlide >= carousel.maxSlide);
        return () => {
            if (props.carousel) {
                carousel = props.carousel;
            }
            if (!carousel) {
                console.warn('[vue3-carousel]: A carousel component must be provided for the navigation component to display');
                return '';
            }
            const { i18n } = carousel.config;
            const prevButton = h('button', Object.assign(Object.assign({ type: 'button', disabled: prevDisabled.value, 'aria-label': i18n['ariaPreviousSlide'], title: i18n['ariaPreviousSlide'], onClick: carousel.nav.prev }, attrs), { class: [
                    'carousel__prev',
                    { 'carousel__prev--disabled': prevDisabled.value },
                    attrs.class,
                ] }), (slotPrev === null || slotPrev === void 0 ? void 0 : slotPrev()) || h(Icon, { name: getPrevIcon() }));
            const nextButton = h('button', Object.assign(Object.assign({ type: 'button', disabled: nextDisabled.value, 'aria-label': i18n['ariaNextSlide'], title: i18n['ariaNextSlide'], onClick: carousel.nav.next }, attrs), { class: [
                    'carousel__next',
                    { 'carousel__next--disabled': nextDisabled.value },
                    attrs.class,
                ] }), (slotNext === null || slotNext === void 0 ? void 0 : slotNext()) || h(Icon, { name: getNextIcon() }));
            return [prevButton, nextButton];
        };
    },
});

const Pagination = defineComponent({
    name: 'CarouselPagination',
    props: {
        disableOnClick: {
            type: Boolean,
        },
        paginateByItemsToShow: {
            type: Boolean,
        },
        carousel: {
            type: Object,
        }
    },
    setup(props) {
        let carousel = inject(injectCarousel, null);
        const itemsToShow = computed(() => carousel.config.itemsToShow);
        const offset = computed(() => getSnapAlignOffset({
            align: carousel.config.snapAlign,
            itemsToShow: itemsToShow.value,
        }));
        const isPaginated = computed(() => props.paginateByItemsToShow && itemsToShow.value > 1);
        const currentPage = computed(() => Math.ceil((carousel.activeSlide - offset.value) / itemsToShow.value));
        const pageCount = computed(() => Math.ceil(carousel.slidesCount / itemsToShow.value));
        const isActive = (slide) => mapNumberToRange(isPaginated.value
            ? {
                val: currentPage.value,
                max: pageCount.value - 1,
                min: 0,
            }
            : {
                val: carousel.activeSlide,
                max: carousel.maxSlide,
                min: carousel.minSlide,
            }) === slide;
        return () => {
            var _a, _b;
            if (props.carousel) {
                carousel = props.carousel;
            }
            if (!carousel) {
                console.warn('[vue3-carousel]: A carousel component must be provided for the pagination component to display');
                return '';
            }
            const children = [];
            for (let slide = isPaginated.value ? 0 : carousel.minSlide; slide <= (isPaginated.value ? pageCount.value - 1 : carousel.maxSlide); slide++) {
                const buttonLabel = i18nFormatter(carousel.config.i18n[isPaginated.value ? 'ariaNavigateToPage' : 'ariaNavigateToSlide'], {
                    slideNumber: slide + 1,
                });
                const active = isActive(slide);
                const button = h('button', {
                    type: 'button',
                    class: {
                        'carousel__pagination-button': true,
                        'carousel__pagination-button--active': active,
                    },
                    'aria-label': buttonLabel,
                    'aria-pressed': active,
                    'aria-controls': (_b = (_a = carousel.slides[slide]) === null || _a === void 0 ? void 0 : _a.exposed) === null || _b === void 0 ? void 0 : _b.id,
                    title: buttonLabel,
                    disabled: props.disableOnClick,
                    onClick: () => carousel.nav.slideTo(isPaginated.value
                        ? Math.floor(slide * +carousel.config.itemsToShow + offset.value)
                        : slide),
                });
                const item = h('li', { class: 'carousel__pagination-item', key: slide }, button);
                children.push(item);
            }
            return h('ol', { class: 'carousel__pagination' }, children);
        };
    },
});

const Slide = defineComponent({
    name: 'CarouselSlide',
    props: {
        id: {
            type: String,
            default: (props) => (props.isClone ? undefined : useId()),
        },
        index: {
            type: Number,
            default: undefined,
        },
        isClone: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { attrs, slots, expose }) {
        const carousel = inject(injectCarousel);
        provide(injectCarousel, undefined); // Don't provide for nested slides
        if (!carousel) {
            return () => ''; // Don't render, let vue warn about the missing provide
        }
        const currentIndex = ref(props.index);
        const setIndex = (newIndex) => {
            currentIndex.value = newIndex;
        };
        const instance = getCurrentInstance();
        const getBoundingRect = () => {
            const el = instance.vnode.el;
            return el ? el.getBoundingClientRect() : { width: 0, height: 0 };
        };
        expose({
            id: props.id,
            setIndex,
            getBoundingRect,
        });
        const isActive = computed(() => currentIndex.value === carousel.activeSlide);
        const isPrev = computed(() => currentIndex.value === carousel.activeSlide - 1);
        const isNext = computed(() => currentIndex.value === carousel.activeSlide + 1);
        const isVisible = computed(() => currentIndex.value >= carousel.visibleRange.min &&
            currentIndex.value <= carousel.visibleRange.max);
        const slideStyle = computed(() => {
            if (carousel.config.itemsToShow === 'auto') {
                return;
            }
            const itemsToShow = carousel.config.itemsToShow;
            const dimension = carousel.config.gap > 0 && itemsToShow > 1
                ? `calc(${100 / itemsToShow}% - ${(carousel.config.gap * (itemsToShow - 1)) / itemsToShow}px)`
                : `${100 / itemsToShow}%`;
            return carousel.isVertical ? { height: dimension } : { width: dimension };
        });
        carousel.slideRegistry.registerSlide(instance, props.index);
        onUnmounted(() => {
            carousel.slideRegistry.unregisterSlide(instance);
        });
        if (props.isClone) {
            // Prevent cloned slides from being focusable
            onMounted(() => {
                disableChildrenTabbing(instance.vnode);
            });
            onUpdated(() => {
                disableChildrenTabbing(instance.vnode);
            });
        }
        return () => {
            var _a, _b;
            if (!carousel.config.enabled) {
                return (_a = slots.default) === null || _a === void 0 ? void 0 : _a.call(slots);
            }
            return h('li', {
                style: [attrs.style, Object.assign({}, slideStyle.value)],
                class: {
                    carousel__slide: true,
                    'carousel__slide--clone': props.isClone,
                    'carousel__slide--visible': isVisible.value,
                    'carousel__slide--active': isActive.value,
                    'carousel__slide--prev': isPrev.value,
                    'carousel__slide--next': isNext.value,
                    'carousel__slide--sliding': carousel.isSliding,
                },
                id: props.isClone ? undefined : props.id,
                'aria-hidden': props.isClone || undefined,
            }, (_b = slots.default) === null || _b === void 0 ? void 0 : _b.call(slots, {
                currentIndex: currentIndex.value,
                isActive: isActive.value,
                isClone: props.isClone,
                isPrev: isPrev.value,
                isNext: isNext.value,
                isSliding: carousel.isSliding,
                isVisible: isVisible.value,
            }));
        };
    },
});

export { BREAKPOINT_MODE_OPTIONS, Carousel, DEFAULT_CONFIG, DEFAULT_DRAG_THRESHOLD, DEFAULT_MOUSE_WHEEL_THRESHOLD, DIR_MAP, DIR_OPTIONS, I18N_DEFAULT_CONFIG, Icon, NORMALIZED_DIR_OPTIONS, Navigation, Pagination, SLIDE_EFFECTS, SNAP_ALIGN_OPTIONS, Slide, createSlideRegistry, icons, injectCarousel };
//# sourceMappingURL=carousel.mjs.map
