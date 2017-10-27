/// <reference types="react" />
import * as React from 'react';
import Video from 'react-native-video';
import { PanResponderInstance, Animated, ViewStyle, NavigatorStatic } from 'react-native';
export declare type ResizeMode = 'cover' | 'contain' | 'stretch';
export interface Props {
    source: {
        uri: string;
        type?: string;
        mainVer?: number;
        patchVer?: number;
    };
    seekColor?: string;
    resizeMode?: ResizeMode;
    paused?: boolean;
    muted?: boolean;
    volume?: number;
    rate?: number;
    playWhenInactive?: boolean;
    playInBackground?: boolean;
    repeat?: boolean;
    title?: string;
    controlTimeout?: number;
    style?: ViewStyle;
    videoStyle?: ViewStyle;
    navigator?: NavigatorStatic;
    onError?: () => void;
    onEnd?: () => void;
    onBack?: () => void;
    onLoadStart?: () => void;
    onLoad?: (data) => void;
    onProgress?: (data) => void;
}
export interface State {
    resizeMode: ResizeMode;
    paused: boolean;
    muted: boolean;
    volume: number;
    rate: number;
    isFullscreen: boolean;
    showTimeRemaining: boolean;
    volumeTrackWidth: number;
    lastScreenPress: number;
    volumeFillWidth: number;
    seekerFillWidth: number;
    showControls: boolean;
    volumePosition: number;
    seekerPosition: number;
    volumeOffset: number;
    seekerOffset: number;
    seeking: boolean;
    loading: boolean;
    currentTime: number;
    error: boolean;
    duration: number;
}
export default class VideoPlayer extends React.Component<Props, State> {
    opts: {
        playWhenInactive: boolean;
        playInBackground: boolean;
        repeat: boolean;
        title: string;
    };
    events: {
        onError: (err) => void;
        onEnd: () => void;
        onScreenTouch: () => void;
        onLoadStart: () => void;
        onProgress: () => void;
        onLoad: () => void;
    };
    methods: {
        onBack: () => void;
        toggleFullscreen: () => void;
        togglePlayPause: () => void;
        toggleControls: () => void;
        toggleTimer: () => void;
    };
    player: {
        controlTimeoutDelay: number;
        volumePanResponder: PanResponderInstance;
        seekPanResponder: PanResponderInstance;
        controlTimeout: number;
        volumeWidth: number;
        iconOffset: number;
        seekWidth: number;
        ref: Video;
    };
    animations: {
        bottomControl: {
            marginBottom: Animated.Value;
            opacity: Animated.Value;
        };
        topControl: {
            marginTop: Animated.Value;
            opacity: Animated.Value;
        };
        video: {
            opacity: Animated.Value;
        };
        loader: {
            rotate: Animated.Value;
            MAX_VALUE: number;
        };
    };
    styles: {
        videoStyle: ViewStyle;
        containerStyle: ViewStyle;
    };
    constructor(props: any);
    /**
    | -------------------------------------------------------
    | Events
    | -------------------------------------------------------
    |
    | These are the events that the <Video> component uses
    | and can be overridden by assigning it as a prop.
    | It is suggested that you override onEnd.
    |
    */
    /**
     * When load starts we display a loading icon
     * and show the controls.
     */
    onLoadStart: () => void;
    /**
     * When load is finished we hide the load icon
     * and hide the controls. We also set the
     * video duration.
     *
     * @param {object} data The video meta data
     */
    onLoad: (data?: any) => void;
    /**
     * For onprogress we fire listeners that
     * update our seekbar and timer.
     *
     * @param {object} data The video meta data
     */
    onProgress: (data?: any) => void;
    /**
     * It is suggested that you override this
     * command so your app knows what to do.
     * Either close the video or go to a
     * new page.
     */
    onEnd: () => void;
    /**
     * Set the error state to true which then
     * changes our renderError function
     *
     * @param {object} err  Err obj returned from <Video> component
     */
    onError: (err: any) => void;
    /**
     * This is a single and double tap listener
     * when the user taps the screen anywhere.
     * One tap toggles controls, two toggles
     * fullscreen mode.
     */
    onScreenTouch: () => void;
    /**
    | -------------------------------------------------------
    | Methods
    | -------------------------------------------------------
    |
    | These are all of our functions that interact with
    | various parts of the class. Anything from
    | calculating time remaining in a video
    | to handling control operations.
    |
    */
    /**
     * Set a timeout when the controls are shown
     * that hides them after a length of time.
     * Default is 15s
     */
    setControlTimeout(): void;
    /**
     * Clear the hide controls timeout.
     */
    clearControlTimeout(): void;
    /**
     * Reset the timer completely
     */
    resetControlTimeout(): void;
    /**
     * Animation to hide controls. We fade the
     * display to 0 then move them off the
     * screen so they're not interactable
     */
    hideControlAnimation(): void;
    /**
     * Animation to show controls...opposite of
     * above...move onto the screen and then
     * fade in.
     */
    showControlAnimation(): void;
    /**
     * Loop animation to spin loader icon. If not loading then stop loop.
     */
    loadAnimation(): void;
    /**
     * Function to hide the controls. Sets our
     * state then calls the animation.
     */
    hideControls: () => void;
    /**
     * Function to toggle controls based on
     * current state.
     */
    toggleControls: () => void;
    /**
     * Toggle fullscreen changes resizeMode on
     * the <Video> component then updates the
     * isFullscreen state.
     */
    toggleFullscreen: () => void;
    /**
     * Toggle playing state on <Video> component
     */
    togglePlayPause: () => void;
    /**
     * Toggle between showing time remaining or
     * video duration in the timer control
     */
    toggleTimer: () => void;
    /**
     * The default 'onBack' function pops the navigator
     * and as such the video player requires a
     * navigator prop by default.
     */
    onBack: () => void;
    /**
     * Calculate the time to show in the timer area
     * based on if they want to see time remaining
     * or duration. Formatted to look as 00:00.
     */
    calculateTime(): string;
    /**
     * Format a time string as mm:ss
     *
     * @param {int} time time in milliseconds
     * @return {string} formatted time string in mm:ss format
     */
    formatTime(time?: number): string;
    /**
     * Set the position of the seekbar's components
     * (both fill and handle) according to the
     * position supplied.
     *
     * @param {float} position position in px of seeker handle}
     */
    setSeekerPosition(position?: number): void;
    /**
     * Contrain the location of the seeker to the
     * min/max value based on how big the
     * seeker is.
     *
     * @param {float} val position of seeker handle in px
     * @return {float} contrained position of seeker handle in px
     */
    constrainToSeekerMinMax(val?: number): number;
    /**
     * Calculate the position that the seeker should be
     * at along its track.
     *
     * @return {float} position of seeker handle in px based on currentTime
     */
    calculateSeekerPosition(): number;
    /**
     * Return the time that the video should be at
     * based on where the seeker handle is.
     *
     * @return {float} time in ms based on seekerPosition.
     */
    calculateTimeFromSeekerPosition(): number;
    /**
     * Seek to a time in the video.
     *
     * @param {float} time time to seek to in ms
     */
    seekTo(time?: number): void;
    /**
     * Set the position of the volume slider
     *
     * @param {float} position position of the volume handle in px
     */
    setVolumePosition(position?: number): void;
    /**
     * Constrain the volume bar to the min/max of
     * its track's width.
     *
     * @param {float} val position of the volume handle in px
     * @return {float} contrained position of the volume handle in px
     */
    constrainToVolumeMinMax(val?: number): number;
    /**
     * Get the volume based on the position of the
     * volume object.
     *
     * @return {float} volume level based on volume handle position
     */
    calculateVolumeFromVolumePosition(): number;
    /**
     * Get the position of the volume handle based
     * on the volume
     *
     * @return {float} volume handle position in px based on volume
     */
    calculateVolumePositionFromVolume(): number;
    /**
    | -------------------------------------------------------
    | React Component functions
    | -------------------------------------------------------
    |
    | Here we're initializing our listeners and getting
    | the component ready using the built-in React
    | Component methods
    |
    */
    /**
     * Before mounting, init our seekbar and volume bar
     * pan responders.
     */
    componentWillMount(): void;
    /**
     * When the component is about to unmount kill the
     * timeout less it fire in the prev/next scene
     */
    componentWillUnmount(): void;
    /**
     * Get our seekbar responder going
     */
    initSeekPanResponder(): void;
    /**
     * Initialize the volume pan responder.
     */
    initVolumePanResponder(): void;
    /**
    | -------------------------------------------------------
    | Rendering
    | -------------------------------------------------------
    |
    | This section contains all of our render methods.
    | In addition to the typical React render func
    | we also have all the render methods for
    | the controls.
    |
    */
    /**
     * Standard render control function that handles
     * everything except the sliders. Adds a
     * consistent <TouchableHighlight>
     * wrapper and styling.
     */
    renderControl(children: any, callback: any, style?: {}): JSX.Element;
    /**
     * Groups the top bar controls together in an animated
     * view and spaces them out.
     */
    renderTopControls(): JSX.Element;
    /**
     * Back button control
     */
    renderBack(): JSX.Element;
    /**
     * Render the volume slider and attach the pan handlers
     */
    renderVolume(): JSX.Element;
    /**
     * Render fullscreen toggle and set icon based on the fullscreen state.
     */
    renderFullscreen(): JSX.Element;
    /**
     * Render bottom control group and wrap it in a holder
     */
    renderBottomControls(): JSX.Element;
    /**
     * Render the seekbar and attach its handlers
     */
    renderSeekbar(): JSX.Element;
    /**
     * Render the play/pause button and show the respective icon
     */
    renderPlayPause(): JSX.Element;
    /**
     * Render our title...if supplied.
     */
    renderTitle(): JSX.Element;
    /**
     * Show our timer.
     */
    renderTimer(): JSX.Element;
    /**
     * Show loading icon
     */
    renderLoader(): JSX.Element;
    renderError(): JSX.Element;
    /**
     * Provide all of our options and render the whole component.
     */
    render(): JSX.Element;
}
