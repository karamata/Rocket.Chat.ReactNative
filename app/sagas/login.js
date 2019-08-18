import {
	put, call, takeLatest, select, take, fork, cancel
} from 'redux-saga/effects';
import RNUserDefaults from 'rn-user-defaults';
import { Base64 } from 'js-base64';

import Navigation from '../lib/Navigation';
import * as types from '../actions/actionsTypes';
import { appStart } from '../actions';
import { serverFinishAdd } from '../actions/server';
import { loginFailure, loginSuccess, setUser } from '../actions/login';
import { roomsRequest } from '../actions/rooms';
import RocketChat from '../lib/rocketchat';
import log from '../utils/log';
import I18n from '../i18n';
import database from '../lib/realm';
import random from '../utils/random';
import EventEmitter from '../utils/events';

const getServer = state => state.server.server;
const getServices = state => state.login.services;
const loginWithPasswordCall = args => RocketChat.loginWithPassword(args);
const loginCall = args => RocketChat.login(args);
const logoutCall = args => RocketChat.logout(args);

const handleLoginRequest = function* handleLoginRequest({ credentials }) {
	try {
		let result;
		if (credentials.resume) {
			result = yield call(loginCall, credentials);
		} else {
			result = yield call(loginWithPasswordCall, credentials);
		}
		return yield put(loginSuccess(result));
	} catch (error) {
		yield put(loginFailure(error));
	}
};

const fetchPermissions = function* fetchPermissions() {
	yield RocketChat.getPermissions();
};

const fetchCustomEmojis = function* fetchCustomEmojis() {
	yield RocketChat.getCustomEmojis();
};

const fetchRoles = function* fetchRoles() {
	yield RocketChat.getRoles();
};

const fetchSlashCommands = function* fetchSlashCommands() {
	yield RocketChat.getSlashCommands();
};

const registerPushToken = function* registerPushToken() {
	yield RocketChat.registerPushToken();
};

const fetchUserPresence = function* fetchUserPresence() {
	yield RocketChat.getUserPresence();
};

const handleLoginSuccess = function* handleLoginSuccess({ user }) {
	try {
		const adding = yield select(state => state.server.adding);
		yield RNUserDefaults.set(RocketChat.TOKEN_KEY, user.token);

		const server = yield select(getServer);
		yield put(roomsRequest());
		yield fork(fetchPermissions);
		yield fork(fetchCustomEmojis);
		yield fork(fetchRoles);
		yield fork(fetchSlashCommands);
		yield fork(registerPushToken);
		yield fork(fetchUserPresence);

		I18n.locale = user.language;

		const { serversDB } = database.databases;
		serversDB.write(() => {
			try {
				serversDB.create('user', user, true);
			} catch (e) {
				log('err_set_user_token', e);
			}
		});

		yield RNUserDefaults.set(`${ RocketChat.TOKEN_KEY }-${ server }`, user.id);
		yield put(setUser(user));
		EventEmitter.emit('connected');

		if (!user.username) {
			yield put(appStart('setUsername'));
		} else if (adding) {
			yield put(serverFinishAdd());
			yield put(appStart('inside'));
		} else {
			yield put(appStart('inside'));
		}
	} catch (e) {
		log('err_handle_login_success', e);
	}
};

const handleLogout = function* handleLogout() {
	const server = yield select(getServer);
	const services = yield select(getServices);
	if (server && services) {
		try {
			console.log('>>>>>>>> error 1');
			yield call(logoutCall, { server });
			console.log('>>>>>>>> error 2');
			const { serversDB } = database.databases;
			console.log('>>>>>>>> error 3');
			// all servers
			const servers = yield serversDB.objects('servers');
			console.log('>>>>>>>> error 4');
			// filter logging out server and delete it
			const serverRecord = servers.filtered('id = $0', server);
			serversDB.write(() => {
				serversDB.delete(serverRecord);
			});
			console.log('>>>>>>>> error 5');
			// yield put(serverRequest(server));
			// eslint-disable-next-line react/destructuring-assignment
			const endpoint = services.edinnova.logoutPath.startsWith('http') ? services.edinnova.logoutPath : `${ services.edinnova.serverURL }${ services.edinnova.logoutPath }`;
			console.log('>>>>>>>> error 6 ');
			// eslint-disable-next-line react/destructuring-assignment
			const redirect_uri = `${ server }/_oauth/edinnova`;
			const state = Base64.encodeURI(JSON.stringify({
				loginStyle: 'popup',
				credentialToken: random(43),
				isCordova: true,
				// eslint-disable-next-line react/destructuring-assignment
				redirectUrl: `${ server }/_oauth/edinnova?close`,
				close: true,
				action: 'logout'
			}));
			console.log('>>>>>>>> error 7 ');
			// eslint-disable-next-line react/destructuring-assignment
			const params = `?client_id=${ services.edinnova.clientId }&redirect_uri=${ redirect_uri }&scope=${ services.edinnova.scope }&state=${ state }&response_type=code`;
			console.log('>>>>>>>> error 8 ', endpoint, params);
			Navigation.navigate('LogoutView', { logoutUrl: `${ endpoint }${ params }` });
		} catch (e) {
			// yield put(serverRequest(appConfig.server));
			log('err_handle_logout', e);
		}
	}
};

const handleSetUser = function handleSetUser({ user }) {
	if (user && user.language) {
		I18n.locale = user.language;
	}
};

const root = function* root() {
	yield takeLatest(types.LOGIN.REQUEST, handleLoginRequest);
	yield takeLatest(types.LOGOUT, handleLogout);
	yield takeLatest(types.USER.SET, handleSetUser);

	while (true) {
		const params = yield take(types.LOGIN.SUCCESS);
		const loginSuccessTask = yield fork(handleLoginSuccess, params);
		yield take(types.SERVER.SELECT_REQUEST);
		yield cancel(loginSuccessTask);
	}
};
export default root;
