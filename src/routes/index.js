// We only need to import the modules necessary for initial render
import CoreLayout from "../components/AppContainer/CoreLayout";
import Home, {HomeRoute} from "./Home";
import DataObjRoute from "./DataObj";
import DataListRoute from "./DataList";
import LoginRoute from "./Login";
import AboutRoute from "./About";
import BuilderRoute from "./Builder";
import PlanningRoute from "./Planning";
import ReportRoute from "./Report";

/*  Note: Instead of using JSX, we recommend using react-router
 PlainRoute objects to build route definitions.   */

export const createRoutes = (store) => ({
	path: '/',
	component: CoreLayout,
	indexRoute: Home,
	childRoutes: [
		LoginRoute(store),
    BuilderRoute(store),
    PlanningRoute(store),
    ReportRoute(store),
		AboutRoute(store),
		DataListRoute(store),
		DataObjRoute(store),

		// если не проканал ни один маршрут, показываем '/'
		HomeRoute(store)
	]
})


/*  Note: childRoutes can be chunked or otherwise loaded programmatically
 using getChildRoutes with the following signature:

 getChildRoutes (location, cb) {
	 require.ensure([], (require) => {
		 cb(null, [
			 // Remove imports!
			 require('./DataObj').default(store)
		 ])
	 })
 }

 However, this is not necessary for code-splitting! It simply provides
 an API for async route definitions. Your code splitting should occur
 inside the route `getComponent` function, since it is only invoked
 when the route exists and matches.
 */

export default createRoutes
