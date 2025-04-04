import { ComponentInternalInstance } from 'vue';
import { ComponentOptionsMixin } from 'vue';
import { ComponentProvideOptions } from 'vue';
import { ComputedRef } from 'vue';
import { DefineComponent } from 'vue';
import { EmitFn } from 'vue';
import { InjectionKey } from 'vue';
import { PublicProps } from 'vue';
import { Reactive } from 'vue';
import { Ref } from 'vue';
import { RendererElement } from 'vue';
import { RendererNode } from 'vue';
import { ShallowReactive } from 'vue';
import { VNode } from 'vue';

export declare const BREAKPOINT_MODE_OPTIONS: readonly ["viewport", "carousel"];

export declare type BreakpointMode = (typeof BREAKPOINT_MODE_OPTIONS)[number];

export declare type Breakpoints = {
    [key: number]: Partial<Omit<CarouselConfig, 'breakpoints' | 'modelValue' | 'breakpointMode'>>;
};

export declare const Carousel: DefineComponent<    {
autoplay?: number | undefined;
breakpointMode?: BreakpointMode | undefined;
breakpoints?: Breakpoints | undefined;
clamp?: boolean | undefined;
dir?: Dir | undefined;
enabled: boolean;
gap: number;
height: string | number;
i18n: { [key in I18nKeys]?: string; };
ignoreAnimations: boolean | string[] | string;
itemsToScroll: number;
itemsToShow: number | "auto";
modelValue?: number | undefined;
mouseDrag?: (boolean | DragConfig) | undefined;
mouseWheel?: (boolean | WheelConfig) | undefined;
mouseScrollThreshold?: number | undefined;
pauseAutoplayOnHover?: boolean | undefined;
preventExcessiveDragging: boolean;
slideEffect: SlideEffect;
snapAlign: SnapAlign;
touchDrag?: (boolean | DragConfig) | undefined;
transition?: number | undefined;
wrapAround?: boolean | undefined;
}, () => VNode<RendererNode, RendererElement, {
[key: string]: any;
}>, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, "slide-registered" | "slide-unregistered" | "drag" | "wheel" | "before-init" | "init" | "loop" | "slide-end" | "slide-start" | "update:modelValue", PublicProps, Readonly<{
autoplay?: number | undefined;
breakpointMode?: BreakpointMode | undefined;
breakpoints?: Breakpoints | undefined;
clamp?: boolean | undefined;
dir?: Dir | undefined;
enabled: boolean;
gap: number;
height: string | number;
i18n: { [key in I18nKeys]?: string; };
ignoreAnimations: boolean | string[] | string;
itemsToScroll: number;
itemsToShow: number | "auto";
modelValue?: number | undefined;
mouseDrag?: (boolean | DragConfig) | undefined;
mouseWheel?: (boolean | WheelConfig) | undefined;
mouseScrollThreshold?: number | undefined;
pauseAutoplayOnHover?: boolean | undefined;
preventExcessiveDragging: boolean;
slideEffect: SlideEffect;
snapAlign: SnapAlign;
touchDrag?: (boolean | DragConfig) | undefined;
transition?: number | undefined;
wrapAround?: boolean | undefined;
}> & Readonly<{}>, {
breakpoints: Breakpoints | undefined;
modelValue: number;
breakpointMode: "viewport" | "carousel";
autoplay: number;
clamp: boolean;
dir: "ltr" | "left-to-right" | "rtl" | "right-to-left" | "ttb" | "top-to-bottom" | "btt" | "bottom-to-top";
enabled: boolean;
gap: number;
height: string | number;
i18n: {
ariaGallery?: string | undefined;
ariaNavigateToPage?: string | undefined;
ariaNavigateToSlide?: string | undefined;
ariaNextSlide?: string | undefined;
ariaPreviousSlide?: string | undefined;
iconArrowDown?: string | undefined;
iconArrowLeft?: string | undefined;
iconArrowRight?: string | undefined;
iconArrowUp?: string | undefined;
itemXofY?: string | undefined;
};
ignoreAnimations: string | boolean | string[];
itemsToScroll: number;
itemsToShow: string | number;
mouseDrag: boolean | DragConfig;
mouseWheel: boolean | WheelConfig;
mouseScrollThreshold: number;
pauseAutoplayOnHover: boolean;
preventExcessiveDragging: boolean;
slideEffect: "slide" | "fade";
snapAlign: "center" | "start" | "end" | "center-even" | "center-odd";
touchDrag: boolean | DragConfig;
transition: number;
wrapAround: boolean;
}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export declare type CarouselConfig = {
    autoplay?: number;
    breakpointMode?: BreakpointMode;
    breakpoints?: Breakpoints;
    clamp?: boolean;
    dir?: Dir;
    enabled: boolean;
    gap: number;
    height: string | number;
    i18n: {
        [key in I18nKeys]?: string;
    };
    ignoreAnimations: boolean | string[] | string;
    itemsToScroll: number;
    itemsToShow: number | 'auto';
    modelValue?: number;
    mouseDrag?: boolean | DragConfig;
    mouseWheel?: boolean | WheelConfig;
    mouseScrollThreshold?: number;
    pauseAutoplayOnHover?: boolean;
    preventExcessiveDragging: boolean;
    slideEffect: SlideEffect;
    snapAlign: SnapAlign;
    touchDrag?: boolean | DragConfig;
    transition?: number;
    wrapAround?: boolean;
};

export declare type CarouselData = {
    config: CarouselConfig;
    currentSlide: Ref<number>;
    maxSlide: Ref<number>;
    middleSlide: Ref<number>;
    minSlide: Ref<number>;
    slideSize: Ref<number>;
    slidesCount: Ref<number>;
};

export declare type CarouselExposed = CarouselMethods & {
    data: Reactive<CarouselData>;
} & InjectedCarousel;

export declare type CarouselMethods = CarouselNav & {
    restartCarousel: () => void;
    updateBreakpointsConfig: () => void;
    updateSlideSize: () => void;
    updateSlidesData: () => void;
};

export declare type CarouselNav = {
    next: (skipTransition?: boolean) => void;
    prev: (skipTransition?: boolean) => void;
    slideTo: (index: number) => void;
};

export declare const createSlideRegistry: (emit: EmitFn) => {
    cleanup: () => void;
    getSlides: () => ShallowReactive<ComponentInternalInstance[]>;
    registerSlide: (slide: ComponentInternalInstance, index?: number) => void;
    unregisterSlide: (slide: ComponentInternalInstance) => void;
};

export declare const DEFAULT_CONFIG: CarouselConfig;

export declare const DEFAULT_DRAG_THRESHOLD = 0.3;

export declare const DEFAULT_MOUSE_WHEEL_THRESHOLD = 10;

export declare type Dir = (typeof DIR_OPTIONS)[number];

export declare const DIR_MAP: {
    readonly 'bottom-to-top': "btt";
    readonly 'left-to-right': "ltr";
    readonly 'right-to-left': "rtl";
    readonly 'top-to-bottom': "ttb";
};

export declare const DIR_OPTIONS: readonly ["ltr", "left-to-right", "rtl", "right-to-left", "ttb", "top-to-bottom", "btt", "bottom-to-top"];

export declare type DragConfig = {
    threshold?: number;
};

export declare type ElRect = {
    height: number;
    width: number;
};

export declare const I18N_DEFAULT_CONFIG: {
    readonly ariaGallery: "Gallery";
    readonly ariaNavigateToPage: "Navigate to page {slideNumber}";
    readonly ariaNavigateToSlide: "Navigate to slide {slideNumber}";
    readonly ariaNextSlide: "Navigate to next slide";
    readonly ariaPreviousSlide: "Navigate to previous slide";
    readonly iconArrowDown: "Arrow pointing downwards";
    readonly iconArrowLeft: "Arrow pointing to the left";
    readonly iconArrowRight: "Arrow pointing to the right";
    readonly iconArrowUp: "Arrow pointing upwards";
    readonly itemXofY: "Item {currentSlide} of {slidesCount}";
};

export declare type I18nKeys = keyof typeof I18N_DEFAULT_CONFIG;

export declare const Icon: DefineComponent<IconProps, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<IconProps> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, false, {}, any>;

export declare enum IconName {
    arrowDown = "arrowDown",
    arrowLeft = "arrowLeft",
    arrowRight = "arrowRight",
    arrowUp = "arrowUp"
}

export declare type IconNameValue = `${IconName}`;

export declare type IconProps = {
    name: IconNameValue;
    title?: string;
};

export declare const icons: {
    arrowDown: string;
    arrowLeft: string;
    arrowRight: string;
    arrowUp: string;
};

export declare const injectCarousel: InjectionKey<InjectedCarousel | undefined>;

export declare type InjectedCarousel = Reactive<{
    activeSlide: Ref<number>;
    config: CarouselConfig;
    currentSlide: Ref<number>;
    isSliding: Ref<boolean>;
    isVertical: ComputedRef<boolean>;
    maxSlide: ComputedRef<number>;
    minSlide: ComputedRef<number>;
    nav: CarouselNav;
    normalizedDir: ComputedRef<NormalizedDir>;
    slideRegistry: SlideRegistry;
    slideSize: Ref<number>;
    slides: ShallowReactive<Array<ComponentInternalInstance>>;
    slidesCount: ComputedRef<number>;
    viewport: Ref<Element | null>;
    visibleRange: ComputedRef<Range_2>;
}>;

export declare const Navigation: DefineComponent<NavigationProps, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<NavigationProps> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, false, {}, any>;

export declare type NavigationProps = {
    carousel?: InstanceType<typeof Carousel> & CarouselExposed;
};

export declare type NonNormalizedDir = keyof typeof DIR_MAP;

export declare const NORMALIZED_DIR_OPTIONS: ("ltr" | "rtl" | "ttb" | "btt")[];

export declare type NormalizedDir = (typeof NORMALIZED_DIR_OPTIONS)[number];

export declare const Pagination: DefineComponent<PaginationProps, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<PaginationProps> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, false, {}, any>;

export declare type PaginationProps = {
    disableOnClick?: boolean;
    paginateByItemsToShow?: boolean;
    carousel?: InstanceType<typeof Carousel> & CarouselExposed;
};

declare type Range_2 = {
    min: number;
    max: number;
};
export { Range_2 as Range }

export declare const Slide: DefineComponent<    {
readonly id?: string | undefined;
readonly index: number;
readonly isClone?: boolean | undefined;
}, (() => string) | (() => VNode<RendererNode, RendererElement, {
[key: string]: any;
}> | VNode<RendererNode, RendererElement, {
[key: string]: any;
}>[] | undefined), {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<{
readonly id?: string | undefined;
readonly index: number;
readonly isClone?: boolean | undefined;
}> & Readonly<{}>, {
isClone: boolean;
index: number;
id: string;
}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export declare const SLIDE_EFFECTS: readonly ["slide", "fade"];

export declare type SlideEffect = (typeof SLIDE_EFFECTS)[number];

export declare type SlideProps = {
    id?: string;
    index: number;
    isClone?: boolean;
};

export declare type SlideRegistry = ReturnType<typeof createSlideRegistry>;

export declare const SNAP_ALIGN_OPTIONS: readonly ["center", "start", "end", "center-even", "center-odd"];

export declare type SnapAlign = (typeof SNAP_ALIGN_OPTIONS)[number];

export declare type VueClass = string | Record<string, boolean> | VueClass[];

export declare type WheelConfig = {
    threshold?: number;
    throttleTime?: number;
};

export { }
