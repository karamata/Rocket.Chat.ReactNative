import React from 'react';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';
import { connect } from 'react-redux';
import { ActivityIndicator, StyleSheet } from 'react-native';
import URI from 'urijs';
import { Base64 } from 'js-base64';

import RocketChat from '../lib/rocketchat';
import { isIOS } from '../utils/deviceInfo';
import StatusBar from '../containers/StatusBar';
import { appInit } from '../actions';

const userAgent = isIOS
	? 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1'
	: 'Mozilla/5.0 (Linux; Android 6.0.1; SM-G920V Build/MMB29K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36';

const styles = StyleSheet.create({
	loading: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center'
	}
});

@connect(state => ({
	server: state.server.server
}), dispatch => ({
	appInit: root => dispatch(appInit(root))
}))
export default class LogoutView extends React.PureComponent {
	static navigationOptions = () => ({
		headerLeft: null,
		title: 'Edinnova Logout'
	})

	static propTypes = {
		navigation: PropTypes.object,
		server: PropTypes.string,
		appInit: PropTypes.func
	}

	constructor(props) {
		super(props);
		this.state = {
			logging: false,
			loading: false
		};
		this.redirectRegex = new RegExp(`(?=.*(${ props.server }))(?=.*(credentialToken))(?=.*(credentialSecret))`, 'g');
	}

	dismiss = () => {
		const { navigation } = this.props;
		navigation.pop();
	}

	login = async(params) => {
		const { logging } = this.state;
		if (logging) {
			return;
		}

		this.setState({ logging: true });

		try {
			await RocketChat.loginOAuth(params);
		} catch (e) {
			console.warn(e);
		}
		this.setState({ logging: false });
		this.dismiss();
	}

	render() {
		const { navigation } = this.props;
		const { loading } = this.state;
		const logoutUrl = navigation.getParam('logoutUrl');
		return (
			<React.Fragment>
				<StatusBar />
				<WebView
					useWebKit
					source={{ uri: logoutUrl }}
					userAgent={userAgent}
					onNavigationStateChange={(webViewState) => {
						const urlObject = URI.parse(webViewState.url);
						const queryObject = URI.parseQuery(urlObject.query);
						const stateObj = JSON.parse(Base64.decode(queryObject.state));

						if (stateObj.action === 'login') {
							const url = decodeURIComponent(webViewState.url);
							if (this.redirectRegex.test(url)) {
								const parts = url.split('#');
								const credentials = JSON.parse(parts[1]);
								this.login({ oauth: { ...credentials } });
							}
						} else if (stateObj.action === 'logout') {
							this.dismiss();
							// eslint-disable-next-line react/destructuring-assignment
							this.props.appInit();
						}
					}}
					onLoadStart={() => {
						this.setState({ loading: true });
					}}

					onLoadEnd={() => {
						this.setState({ loading: false });
					}}
				/>
				{ loading ? <ActivityIndicator size='large' style={styles.loading} /> : null }
			</React.Fragment>
		);
	}
}
