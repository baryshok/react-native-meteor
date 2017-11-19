import ReactNative from 'react-native';
import minimongo from 'minimongo-cache';
import Trackr from 'trackr';
import { InteractionManager } from 'react-native';
process.nextTick = setImmediate;

const db = new minimongo();
db.debug = false;
db.batchedUpdates = ReactNative.unstable_batchedUpdates;

function runAfterOtherComputations(fn){
  const interactionsTimeout = new Promise((resolve, reject) => {
    InteractionManager.runAfterInteractions(resolve);
  });

  const maxTimeout = new Promise((resolve, reject) => {
    this.sceneTransitionTimeout = setTimeout(resolve, 1000);
  });

  const onSuccess = () => {
    Trackr.afterFlush(() => {
      fn();
    });
  };

  const onFailure = (error) => {
    console.log('[Error][RNMeteor][Data.runAfterOtherComputations]', error);
  };

  Promise.race([ interactionsTimeout, maxTimeout ]).then(onSuccess).catch(onFailure);
}

export default {
  _endpoint: null,
  _options: null,
  ddp: null,
  subscriptions: {},
  db: db,
  calls: [],

  getUrl() {
    return this._endpoint.substring(0, this._endpoint.indexOf('/websocket'));
  },

  waitDdpReady(cb) {
    if(this.ddp) {
      cb();
    } else {
      runAfterOtherComputations(()=>{
        this.waitDdpReady(cb);
      });
    }
  },

  _cbs: [],
  onChange(cb) {
    this.db.on('change', cb);
    this.ddp.on('connected', cb);
    this.ddp.on('disconnected', cb);
    this.on('loggingIn', cb);
    this.on('change', cb);
  },
  offChange(cb) {
    this.db.off('change', cb);
    this.ddp.off('connected', cb);
    this.ddp.off('disconnected', cb);
    this.off('loggingIn', cb);
    this.off('change', cb);
  },
  on(eventName, cb) {
    this._cbs.push({
      eventName: eventName,
      callback: cb
    });
  },
  off(eventName, cb) {
    this._cbs.splice(this._cbs.findIndex(_cb=>_cb.callback == cb && _cb.eventName == eventName), 1);
  },
  notify(eventName, ...args) {
    this._cbs.map(cb=>{
      if(cb.eventName == eventName && typeof cb.callback == 'function') {
        cb.callback(...args);
      }
    });
  },
  waitDdpConnected(cb) {
    if(this.ddp && this.ddp.status == 'connected') {
      cb();
    } else if(this.ddp) {
      this.ddp.once('connected', cb);
    } else {
      setTimeout(()=>{ this.waitDdpConnected(cb) }, 10);
    }
  }
}
