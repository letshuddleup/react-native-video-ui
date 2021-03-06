import * as React from 'react';
import Video from 'react-native-video';
import {
  TouchableWithoutFeedback,
  TouchableHighlight,
  PanResponder,
  PanResponderInstance,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Text,
  View,
  ViewStyle,
  NavigatorStatic,
} from 'react-native';
import * as _ from 'lodash';

const topVignette = require('./assets/img/top-vignette.png');
const bottomVignette = require('./assets/img/bottom-vignette.png');
const backIcon = require('./assets/img/back.png');
const volumeIcon = require('./assets/img/volume.png');
const shrinkIcon = require('./assets/img/shrink.png');
const expandIcon = require('./assets/img/expand.png');
const playIcon = require('./assets/img/play.png');
const pauseIcon = require('./assets/img/pause.png');
const loaderIcon = require('./assets/img/loader-icon.png');
const errorIcon = require('./assets/img/error-icon.png');

export type ResizeMode = 'cover' | 'contain' | 'stretch';

export interface Props {
  source: {
    uri: string,
    type?: string,
    mainVer?: number,
    patchVer?: number,
  },
  seekColor?: string,

  resizeMode?: ResizeMode,
  paused?: boolean,
  muted?: boolean,
  volume?: number,
  rate?: number,

  playWhenInactive?: boolean,
  playInBackground?: boolean,
  repeat?: boolean,
  title?: string,

  controlTimeout?: number,
  style?: ViewStyle,
  videoStyle?: ViewStyle,
  navigator?: NavigatorStatic,

  onError?: () => void,
  onEnd?: () => void,
  onBack?: () => void,
  onLoadStart?: () => void,
  onLoad?: (data) => void,
  onProgress?: (data) => void,
}

export interface State {
  // Video
  resizeMode: ResizeMode,
  paused: boolean,
  muted: boolean,
  volume: number,
  rate: number,

  // Controls
  isFullscreen: boolean,
  showTimeRemaining: boolean,
  volumeTrackWidth: number,
  lastScreenPress: number,
  volumeFillWidth: number,
  seekerFillWidth: number,
  showControls: boolean,
  volumePosition: number,
  seekerPosition: number,
  volumeOffset: number,
  seekerOffset: number,
  seeking: boolean,
  loading: boolean,
  currentTime: number,
  error: boolean,
  duration: number,
}

export default class VideoPlayer extends React.Component<Props, State> {

  opts: {
    playWhenInactive: boolean,
    playInBackground: boolean,
    repeat: boolean,
    title: string,
  };

  events: {
    onError: (err) => void,
    onEnd: () => void,
    onScreenTouch: () => void,
    onLoadStart: () => void,
    onProgress: () => void,
    onLoad: () => void,
  };

  methods: {
    onBack: () => void,
    toggleFullscreen: () => void,
    togglePlayPause: () => void,
    toggleControls: () => void,
    toggleTimer: () => void,
  };

  player: {
    controlTimeoutDelay: number,
    volumePanResponder: PanResponderInstance,
    seekPanResponder: PanResponderInstance,
    controlTimeout: number,
    volumeWidth: number,
    iconOffset: number,
    seekWidth: number,
    ref: Video,
  };

  animations: {
    bottomControl: {
      marginBottom: Animated.Value,
      opacity: Animated.Value,
    },
    topControl: {
      marginTop: Animated.Value,
      opacity: Animated.Value,
    },
    video: {
      opacity: Animated.Value,
    },
    loader: {
      rotate: Animated.Value,
      MAX_VALUE: number,
    }
  };

  styles: {
    videoStyle: ViewStyle,
    containerStyle: ViewStyle,
  };

  constructor(props) {
    super(props);

    /**
     * All of our values that are updated by the
     * methods and listeners in this class
     */
    this.state = {
      // Video
      resizeMode: this.props.resizeMode || 'contain',
      paused: this.props.paused || false,
      muted: this.props.muted || false,
      volume: this.props.volume || 1,
      rate: this.props.rate || 1,
      // Controls

      isFullscreen: this.props.resizeMode === 'cover' || false,
      showTimeRemaining: true,
      volumeTrackWidth: 0,
      lastScreenPress: 0,
      volumeFillWidth: 0,
      seekerFillWidth: 0,
      showControls: true,
      volumePosition: 0,
      seekerPosition: 0,
      volumeOffset: 0,
      seekerOffset: 0,
      seeking: false,
      loading: false,
      currentTime: 0,
      error: false,
      duration: 0,
    };

    const position = this.calculateVolumePositionFromVolume();
    this.setVolumePosition(position);
    this.setState({ volumeOffset: position });

    /**
     * Any options that can be set at init.
     */
    this.opts = {
      playWhenInactive: this.props.playWhenInactive || false,
      playInBackground: this.props.playInBackground || false,
      repeat: this.props.repeat || false,
      title: this.props.title || '',
    };

    /**
     * Our app listeners and associated methods
     */
    this.events = {
      onError: this.props.onError || this.onError,
      onEnd: this.props.onEnd || this.onEnd,
      onScreenTouch: this.onScreenTouch,
      onLoadStart: this.onLoadStart,
      onProgress: this.onProgress,
      onLoad: this.onLoad,
    };

    /**
     * Functions used throughout the application
     */
    this.methods = {
      onBack: this.props.onBack || this.onBack,
      toggleFullscreen: this.toggleFullscreen,
      togglePlayPause: this.togglePlayPause,
      toggleControls: this.toggleControls,
      toggleTimer: this.toggleTimer,
    };

    /**
     * Player information
     */
    this.player = {
      controlTimeoutDelay: this.props.controlTimeout || 15000,
      volumePanResponder: null,
      seekPanResponder: null,
      controlTimeout: null,
      volumeWidth: 150,
      iconOffset: 7,
      seekWidth: 0,
      ref: Video,
    };

    /**
     * Various animations
     */
    this.animations = {
      bottomControl: {
        marginBottom: new Animated.Value(0),
        opacity: new Animated.Value(1),
      },
      topControl: {
        marginTop: new Animated.Value(0),
        opacity: new Animated.Value(1),
      },
      video: {
        opacity: new Animated.Value(1),
      },
      loader: {
        rotate: new Animated.Value(0),
        MAX_VALUE: 360,
      },
    };

    /**
     * Various styles that be added...
     */
    this.styles = {
      videoStyle: this.props.videoStyle || {},
      containerStyle: this.props.style || {},
    };
  }


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
  onLoadStart = () => {
    this.loadAnimation();
    this.setState({ loading: true });

    if (typeof this.props.onLoadStart === 'function') {
      this.props.onLoadStart(...arguments);
    }
  }

  /**
   * When load is finished we hide the load icon
   * and hide the controls. We also set the
   * video duration.
   *
   * @param {object} data The video meta data
   */
  onLoad = (data = {} as any) => {
    this.setState({ duration: data.duration, loading: false });

    if (this.state.showControls) {
      this.setControlTimeout();
    }

    if (typeof this.props.onLoad === 'function') {
      this.props.onLoad(data);
    }
  }

  /**
   * For onprogress we fire listeners that
   * update our seekbar and timer.
   *
   * @param {object} data The video meta data
   */
  onProgress = (data = {} as any) => {
    if (!this.state.seeking) {
      const position = this.calculateSeekerPosition();
      this.setSeekerPosition(position);
    }

    if (typeof this.props.onProgress === 'function') {
      this.props.onProgress(data);
    }

    this.setState({ currentTime: data.currentTime });
  }

  /**
   * It is suggested that you override this
   * command so your app knows what to do.
   * Either close the video or go to a
   * new page.
   */
  onEnd = () => { }

  /**
   * Set the error state to true which then
   * changes our renderError function
   *
   * @param {object} err  Err obj returned from <Video> component
   */
  onError = (err) => {
    this.setState({ error: true, loading: false });
  }

  /**
   * This is a single and double tap listener
   * when the user taps the screen anywhere.
   * One tap toggles controls, two toggles
   * fullscreen mode.
   */
  onScreenTouch = () => {
    const time = new Date().getTime();
    const delta = time - this.state.lastScreenPress;

    if (delta < 300) {
      this.methods.toggleFullscreen();
    }

    this.methods.toggleControls();

    this.setState({ lastScreenPress: time });
  }


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
  setControlTimeout() {
    this.player.controlTimeout = setTimeout(() => {
      this.hideControls();
    }, this.player.controlTimeoutDelay);
  }

  /**
   * Clear the hide controls timeout.
   */
  clearControlTimeout() {
    clearTimeout(this.player.controlTimeout);
  }

  /**
   * Reset the timer completely
   */
  resetControlTimeout() {
    this.clearControlTimeout();
    this.setControlTimeout();
  }

  /**
   * Animation to hide controls. We fade the
   * display to 0 then move them off the
   * screen so they're not interactable
   */
  hideControlAnimation() {
    Animated.parallel([
      Animated.timing(
        this.animations.topControl.opacity,
        { toValue: 0 },
      ),
      Animated.timing(
        this.animations.topControl.marginTop,
        { toValue: -100 },
      ),
      Animated.timing(
        this.animations.bottomControl.opacity,
        { toValue: 0 },
      ),
      Animated.timing(
        this.animations.bottomControl.marginBottom,
        { toValue: -100 },
      ),
    ]).start();
  }

  /**
   * Animation to show controls...opposite of
   * above...move onto the screen and then
   * fade in.
   */
  showControlAnimation() {
    Animated.parallel([
      Animated.timing(
        this.animations.topControl.opacity,
        { toValue: 1 },
      ),
      Animated.timing(
        this.animations.topControl.marginTop,
        { toValue: 0 },
      ),
      Animated.timing(
        this.animations.bottomControl.opacity,
        { toValue: 1 },
      ),
      Animated.timing(
        this.animations.bottomControl.marginBottom,
        { toValue: 0 },
      ),
    ]).start();
  }

  /**
   * Loop animation to spin loader icon. If not loading then stop loop.
   */
  loadAnimation() {
    if (this.state.loading) {
      Animated.sequence([
        Animated.timing(
          this.animations.loader.rotate,
          {
            toValue: this.animations.loader.MAX_VALUE,
            duration: 1500,
            easing: Easing.linear,
          },
        ),
        Animated.timing(
          this.animations.loader.rotate,
          {
            toValue: 0,
            duration: 0,
            easing: Easing.linear,
          },
        ),
      ]).start(this.loadAnimation.bind(this));
    }
  }

  /**
   * Function to hide the controls. Sets our
   * state then calls the animation.
   */
  hideControls = () => {
    this.hideControlAnimation();

    this.setState({ showControls: false });
  }

  /**
   * Function to toggle controls based on
   * current state.
   */
  toggleControls = () => {
    if (this.state.showControls) {
      this.showControlAnimation();
      this.setControlTimeout();
    } else {
      this.hideControlAnimation();
      this.clearControlTimeout();
    }

    this.setState({ showControls: !this.state.showControls });
  }

  /**
   * Toggle fullscreen changes resizeMode on
   * the <Video> component then updates the
   * isFullscreen state.
   */
  toggleFullscreen = () => {
    this.setState({ isFullscreen: !this.state.isFullscreen, resizeMode: this.state.isFullscreen === true ? 'cover' : 'contain' });
  }

  /**
   * Toggle playing state on <Video> component
   */
  togglePlayPause = () => {
    this.setState({ paused: !this.state.paused });
  }

  /**
   * Toggle between showing time remaining or
   * video duration in the timer control
   */
  toggleTimer = () => {
    this.setState({ showTimeRemaining: this.state.showTimeRemaining });
  }

  /**
   * The default 'onBack' function pops the navigator
   * and as such the video player requires a
   * navigator prop by default.
   */
  onBack = () => {
    if (this.props.navigator && this.props.navigator.pop) {
      this.props.navigator.pop();
    } else {
      console.warn('Warning: _onBack requires navigator property to function. Either modify the onBack prop or pass a navigator prop');
    }
  }

  /**
   * Calculate the time to show in the timer area
   * based on if they want to see time remaining
   * or duration. Formatted to look as 00:00.
   */
  calculateTime() {
    if (this.state.showTimeRemaining) {
      const time = this.state.duration - this.state.currentTime;
      return `-${this.formatTime(time)}`;
    }

    return this.formatTime(this.state.currentTime);
  }

  /**
   * Format a time string as mm:ss
   *
   * @param {int} time time in milliseconds
   * @return {string} formatted time string in mm:ss format
   */
  formatTime(time = 0) {
    const symbol = this.state.showTimeRemaining ? '-' : '';
    const timePlayed = Math.min(
      Math.max(time, 0),
      this.state.duration,
    );

    const formattedMinutes = _.padStart(Math.floor(timePlayed / 60).toFixed(0), 2, '0');
    const formattedSeconds = _.padStart(Math.floor(timePlayed % 60).toFixed(0), 2, '0');

    return `${symbol}${formattedMinutes}:${formattedSeconds}`;
  }

  /**
   * Set the position of the seekbar's components
   * (both fill and handle) according to the
   * position supplied.
   *
   * @param {float} position position in px of seeker handle}
   */
  setSeekerPosition(position = 0) {
    const newPosition = this.constrainToSeekerMinMax(position);

    const seekerOffset = this.state.seeking ? this.state.seekerOffset : newPosition;

    this.setState({ seekerFillWidth: newPosition, seekerPosition: newPosition, seekerOffset });
  }

  /**
   * Contrain the location of the seeker to the
   * min/max value based on how big the
   * seeker is.
   *
   * @param {float} val position of seeker handle in px
   * @return {float} contrained position of seeker handle in px
   */
  constrainToSeekerMinMax(val = 0) {
    if (val <= 0) {
      return 0;
    } else if (val >= this.player.seekWidth) {
      return this.player.seekWidth;
    }
    return val;
  }

  /**
   * Calculate the position that the seeker should be
   * at along its track.
   *
   * @return {float} position of seeker handle in px based on currentTime
   */
  calculateSeekerPosition() {
    const percent = this.state.currentTime / this.state.duration;
    return this.player.seekWidth * percent;
  }

  /**
   * Return the time that the video should be at
   * based on where the seeker handle is.
   *
   * @return {float} time in ms based on seekerPosition.
   */
  calculateTimeFromSeekerPosition() {
    const percent = this.state.seekerPosition / this.player.seekWidth;
    return this.state.duration * percent;
  }

  /**
   * Seek to a time in the video.
   *
   * @param {float} time time to seek to in ms
   */
  seekTo(time = 0) {
    this.player.ref.seek(time);
    this.setState({ currentTime: time });
  }

  /**
   * Set the position of the volume slider
   *
   * @param {float} position position of the volume handle in px
   */
  setVolumePosition(position = 0) {
    const state = this.state;
    const newPosition = this.constrainToVolumeMinMax(position);
    const volumeFillWidth = this.state.volumeFillWidth < 0 ? 0 : newPosition;
    const volumeTrackWidth = this.state.volumeTrackWidth > 150 ? 150 : this.player.volumeWidth - state.volumeFillWidth;

    this.setState({ volumePosition: newPosition + this.player.iconOffset, volumeFillWidth, volumeTrackWidth });
  }

  /**
   * Constrain the volume bar to the min/max of
   * its track's width.
   *
   * @param {float} val position of the volume handle in px
   * @return {float} contrained position of the volume handle in px
   */
  constrainToVolumeMinMax(val = 0) {
    if (val <= 0) {
      return 0;
    } else if (val >= this.player.volumeWidth + 9) {
      return this.player.volumeWidth + 9;
    }
    return val;
  }

  /**
   * Get the volume based on the position of the
   * volume object.
   *
   * @return {float} volume level based on volume handle position
   */
  calculateVolumeFromVolumePosition() {
    return this.state.volumePosition / this.player.volumeWidth;
  }

  /**
   * Get the position of the volume handle based
   * on the volume
   *
   * @return {float} volume handle position in px based on volume
   */
  calculateVolumePositionFromVolume() {
    return this.player.volumeWidth / this.state.volume;
  }


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
  componentWillMount() {
    this.initSeekPanResponder();
    this.initVolumePanResponder();
  }


  /**
   * When the component is about to unmount kill the
   * timeout less it fire in the prev/next scene
   */
  componentWillUnmount() {
    this.clearControlTimeout();
  }

  /**
   * Get our seekbar responder going
   */
  initSeekPanResponder() {
    this.player.seekPanResponder = PanResponder.create({

      // Ask to be the responder.
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,

      /**
       * When we start the pan tell the machine that we're
       * seeking. This stops it from updating the seekbar
       * position in the onProgress listener.
       */
      onPanResponderGrant: (evt, gestureState) => {
        this.clearControlTimeout();
        this.setState({ seeking: true });
      },

      /**
       * When panning, update the seekbar position, duh.
       */
      onPanResponderMove: (evt, gestureState) => {
        const position = this.state.seekerOffset + gestureState.dx;
        this.setSeekerPosition(position);
      },

      /**
       * On release we update the time and seek to it in the video.
       * If you seek to the end of the video we fire the
       * onEnd callback
       */
      onPanResponderRelease: (evt, gestureState) => {
        const time = this.calculateTimeFromSeekerPosition();
        if (time >= this.state.duration && !this.state.loading) {
          this.setState({ paused: true });
          this.events.onEnd();
        } else {
          this.seekTo(time);
          this.setControlTimeout();
          this.setState({ seeking: false });
        }
      },
    });
  }

  /**
   * Initialize the volume pan responder.
   */
  initVolumePanResponder() {
    this.player.volumePanResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onPanResponderGrant: (evt, gestureState) => {
        this.clearControlTimeout();
      },

      /**
       * Update the volume as we change the position.
       * If we go to 0 then turn on the mute prop
       * to avoid that weird static-y sound.
       */
      onPanResponderMove: (evt, gestureState) => {
        const position = this.state.volumeOffset + gestureState.dx;

        this.setVolumePosition(position);
        const volume = this.calculateVolumeFromVolumePosition();

        if (this.state.volume <= 0) {
          this.setState({ volume, muted: true });
        } else {
          this.setState({ volume, muted: false });
        }
      },

      /**
       * Update the offset...
       */
      onPanResponderRelease: (evt, gestureState) => {
        this.setControlTimeout();
        this.setState({ volumeOffset: this.state.volumePosition });
      },
    });
  }


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
  renderControl(children, callback, style = {}) {
    return (
      <TouchableHighlight
        underlayColor="transparent"
        activeOpacity={0.3}
        onPress={() => {
          this.resetControlTimeout();
          callback();
        }}
        style={[
          styles.controls.control,
          style,
        ]}
      >
        {children}
      </TouchableHighlight>
    );
  }

  /**
   * Groups the top bar controls together in an animated
   * view and spaces them out.
   */
  renderTopControls() {
    return (
      <Animated.View
        style={[
          styles.controls.top,
          {
            opacity: this.animations.topControl.opacity,
            marginTop: this.animations.topControl.marginTop,
          },
        ]}
      >
        <Image
          source={topVignette}
          style={[styles.controls.column, styles.controls.vignette,
          ]}
        >
          <View style={styles.controls.topControlGroup}>
            {this.renderBack()}
            <View style={styles.controls.pullRight}>
              {this.renderVolume()}
              {this.renderFullscreen()}
            </View>
          </View>
        </Image>
      </Animated.View>
    );
  }

  /**
   * Back button control
   */
  renderBack() {
    return this.renderControl(
      <Image
        source={backIcon}
      />,
      this.methods.onBack,
    );
  }

  /**
   * Render the volume slider and attach the pan handlers
   */
  renderVolume() {
    return (
      <View style={styles.volume.container}>
        <View style={[styles.volume.fill, { width: this.state.volumeFillWidth }]} />
        <View style={[styles.volume.track, { width: this.state.volumeTrackWidth }]} />
        <View
          style={[
            styles.volume.handle,
            { left: this.state.volumePosition },
          ]}
          {...this.player.volumePanResponder.panHandlers}
        >
          <Image source={volumeIcon} />
        </View>
      </View>
    );
  }

  /**
   * Render fullscreen toggle and set icon based on the fullscreen state.
   */
  renderFullscreen() {
    const source = this.state.isFullscreen === true ? shrinkIcon : expandIcon;
    return this.renderControl(
      <Image source={source} />,
      this.methods.toggleFullscreen,
      styles.controls.fullscreen,
    );
  }

  /**
   * Render bottom control group and wrap it in a holder
   */
  renderBottomControls() {
    return (
      <Animated.View
        style={[
          styles.controls.bottom,
          {
            opacity: this.animations.bottomControl.opacity,
            marginBottom: this.animations.bottomControl.marginBottom,
          },
        ]}
      >
        <Image
          source={bottomVignette}
          style={[styles.controls.column, styles.controls.vignette,
          ]}
        >
          {this.renderSeekbar()}
          <View style={[styles.controls.row, styles.controls.bottomControlGroup]}>
            {this.renderPlayPause()}
            {this.renderTitle()}
            {this.renderTimer()}
          </View>
        </Image>
      </Animated.View>
    );
  }

  /**
   * Render the seekbar and attach its handlers
   */
  renderSeekbar() {
    return (
      <View style={styles.seekbar.container}>
        <View
          style={styles.seekbar.track}
          onLayout={(event) => { this.player.seekWidth = event.nativeEvent.layout.width; }}
        >
          <View
            style={[
              styles.seekbar.fill,
              {
                width: this.state.seekerFillWidth,
                backgroundColor: this.props.seekColor || '#FFF',
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.seekbar.handle,
            { left: this.state.seekerPosition },
          ]}
          {...this.player.seekPanResponder.panHandlers}
        >
          <View style={[styles.seekbar.circle, { backgroundColor: this.props.seekColor || '#FFF' }]} />
        </View>
      </View>
    );
  }

  /**
   * Render the play/pause button and show the respective icon
   */
  renderPlayPause() {
    const source = this.state.paused === true ? playIcon : pauseIcon;
    return this.renderControl(
      <Image source={source} />,
      this.methods.togglePlayPause,
      styles.controls.playPause,
    );
  }

  /**
   * Render our title...if supplied.
   */
  renderTitle() {
    if (this.opts.title) {
      return (
        <View style={[styles.controls.control, styles.controls.title]}>
          <Text style={[styles.controls.text, styles.controls.titleText]} numberOfLines={1}>
            {this.opts.title || ''}
          </Text>
        </View>
      );
    }

    return null;
  }

  /**
   * Show our timer.
   */
  renderTimer() {
    return this.renderControl(
      <Text style={styles.controls.timerText}>
        {this.calculateTime()}
      </Text>,
      this.methods.toggleTimer,
      styles.controls.timer,
    );
  }

  /**
   * Show loading icon
   */
  renderLoader() {
    if (this.state.loading) {
      return (
        <View style={styles.loader.container}>
          <Animated.Image
            source={loaderIcon}
            style={[
              {
                transform: [
                  {
                    rotate: this.animations.loader.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      );
    }
    return null;
  }

  renderError() {
    if (this.state.error) {
      return (
        <View style={styles.error.container}>
          <Image source={errorIcon} style={styles.error.icon} />
          <Text style={styles.error.text}>
            Video unavailable
                  </Text>
        </View>
      );
    }
    return null;
  }

  /**
   * Provide all of our options and render the whole component.
   */
  render() {
    return (
      <TouchableWithoutFeedback
        onPress={this.events.onScreenTouch}
        style={[styles.player.container, this.styles.containerStyle]}
      >
        <View style={[styles.player.container, this.styles.containerStyle]}>
          <Video
            {...this.props}
            ref={(videoPlayer) => { this.player.ref = videoPlayer; }}

            resizeMode={this.state.resizeMode}
            volume={this.state.volume}
            paused={this.state.paused}
            muted={this.state.muted}
            rate={this.state.rate}

            onLoadStart={this.events.onLoadStart}
            onProgress={this.events.onProgress}
            onError={this.events.onError}
            onLoad={this.events.onLoad}
            onEnd={this.events.onEnd}

            style={[styles.player.video, this.styles.videoStyle]}

            source={this.props.source}
          />
          {this.renderError()}
          {this.renderTopControls()}
          {this.renderLoader()}
          {this.renderBottomControls()}
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

/**
 * This object houses our styles. There's player
 * specific styles and control specific ones.
 * And then there's volume/seeker styles.
 */
const styles = {
  player: StyleSheet.create({
    container: {
      backgroundColor: '#000',
      flex: 1,
      alignSelf: 'stretch',
      justifyContent: 'space-between',
    },
    video: {
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  }),
  error: StyleSheet.create({
    container: {
      backgroundColor: 'rgba( 0, 0, 0, 0.5 )',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      marginBottom: 16,
    },
    text: {
      backgroundColor: 'transparent',
      color: '#f27474',
    },
  }),
  loader: StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
  controls: StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: null,
      width: null,
    },
    column: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: null,
      width: null,
    },
    vignette: {
      resizeMode: 'stretch',
    },
    control: {
      padding: 16,
    },
    text: {
      backgroundColor: 'transparent',
      color: '#FFF',
      fontSize: 14,
      textAlign: 'center',
    },
    pullRight: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    top: {
      flex: 1,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
    },
    bottom: {
      alignItems: 'stretch',
      flex: 2,
      justifyContent: 'flex-end',
    },
    topControlGroup: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexDirection: 'row',
      width: null,
      margin: 12,
      marginBottom: 18,
    },
    bottomControlGroup: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginLeft: 12,
      marginRight: 12,
      marginBottom: 0,
    },
    volume: {
      flexDirection: 'row',
    },
    fullscreen: {
      flexDirection: 'row',
    },
    playPause: {
      position: 'relative',
      width: 80,
      zIndex: 0,
    },
    title: {
      alignItems: 'center',
      flex: 0.6,
      flexDirection: 'column',
      padding: 0,
    },
    titleText: {
      textAlign: 'center',
    },
    timer: {
      width: 80,
    },
    timerText: {
      backgroundColor: 'transparent',
      color: '#FFF',
      fontSize: 11,
      textAlign: 'right',
    },
  }),
  volume: StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexDirection: 'row',
      height: 1,
      marginLeft: 20,
      marginRight: 20,
      width: 150,
    },
    track: {
      backgroundColor: '#333',
      height: 1,
      marginLeft: 7,
    },
    fill: {
      backgroundColor: '#FFF',
      height: 1,
    },
    handle: {
      position: 'absolute',
      marginTop: -24,
      marginLeft: -24,
      padding: 16,
    },
  }),
  seekbar: StyleSheet.create({
    container: {
      alignSelf: 'stretch',
      height: 28,
      marginLeft: 20,
      marginRight: 20,
    },
    track: {
      backgroundColor: '#333',
      height: 1,
      position: 'relative',
      top: 14,
      width: '100%',
    },
    fill: {
      backgroundColor: '#FFF',
      height: 1,
      width: '100%',
    },
    handle: {
      position: 'absolute',
      marginLeft: -7,
      height: 28,
      width: 28,
    },
    circle: {
      borderRadius: 12,
      position: 'relative',
      top: 8,
      left: 8,
      height: 12,
      width: 12,
    },
  }),
};
