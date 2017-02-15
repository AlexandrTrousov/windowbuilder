// import { injectReducer } from '../../store/reducers'
import $p from "metadata";
import DumbLoader from "components/DumbLoader";

export default (store) => ({

  path: '/:meta/:guid/builder(/:options)',

	/*  Async getComponent is only invoked when route matches   */
	getComponent (nextState, cb) {
		/*  Webpack - use 'require.ensure' to create a split point
		 and embed an async module loader (jsonp) when bundling   */
		require.ensure([], (require) => {

			/*  Add the reducer to the store on key 'counter'  */
			// const reducer = require('./modules/dataobjReducer').default
			// injectReducer(store, { key: 'counter', reducer })

			const _mgr = $p.md.mgr_by_class_name(nextState.params.meta);

			if (_mgr && store.getState().meta.data_loaded) {

				const _obj = _mgr.get(nextState.params.guid)

				/*  Webpack - use require callback to define dependencies for bundling   */
				const Container = require('./Container').default

				if (_obj instanceof Promise) {
					_obj.then((_obj) => {
						if (_obj.is_new()) {

							setTimeout(() => {
								$p.UI.history.push('/')
							})

						} else {
							/*  Return getComponent   */
							cb(null, Container)
						}
					})
				} else {
					/*  Return getComponent   */
					cb(null, Container)
				}

			} else {
				/*  Return getComponent   */
				cb(null, DumbLoader)
			}

			/* Webpack named bundle   */
		}, 'builder');

	}
})
