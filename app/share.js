import React from 'react';
import { View } from 'react-native';
import { createAppContainer, createStackNavigator, createSwitchNavigator } from 'react-navigation';
import { Provider } from 'react-redux';
import RNUserDefaults from 'rn-user-defaults';

import appConfig from '../app.json';
import Navigation from './lib/ShareNavigation';
import store from './lib/createStore';
import sharedStyles from './views/Styles';
import { isNotch, isIOS } from './utils/deviceInfo';
import { defaultHeader, onNavigationStateChange } from './utils/navigation';
import RocketChat from './lib/rocketchat';

const InsideNavigator = createStackNavigator({
	ShareListView: {
		getScreen: () => require('./views/ShareListView').default
	},
	ShareView: {
		getScreen: () => require('./views/ShareView').default
	},
	SelectServerView: {
		getScreen: () => require('./views/SelectServerView').default
	}
}, {
	initialRouteName: 'ShareListView',
	defaultNavigationOptions: defaultHeader
});

const OutsideNavigator = createStackNavigator({
	WithoutLoginView: {
		getScreen: () => require('./views/WithoutLoginView').default
	}
}, {
	initialRouteName: 'WithoutLoginView',
	defaultNavigationOptions: defaultHeader
});

const AppContainer = createAppContainer(createSwitchNavigator({
	OutsideStack: OutsideNavigator,
	InsideStack: InsideNavigator,
	AuthLoading: {
		getScreen: () => require('./views/AuthLoadingView').default
	}
},
{
	initialRouteName: 'AuthLoading'
}));

class Root extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			isLandscape: false
		};
		this.init();
	}

	init = async() => {
		if (isIOS) {
			await RNUserDefaults.setName('group.ios.edinnova.app');
		}
		const token = await RNUserDefaults.get(RocketChat.TOKEN_KEY);

		if (token) {
			await Navigation.navigate('InsideStack');
			await RocketChat.shareExtensionInit(appConfig.server);
		} else {
			await Navigation.navigate('OutsideStack');
		}
	}

	handleLayout = (event) => {
		const { width, height } = event.nativeEvent.layout;
		this.setState({ isLandscape: width > height });
	}

	render() {
		const { isLandscape } = this.state;
		return (
			<View
				style={[sharedStyles.container, isLandscape && isNotch ? sharedStyles.notchLandscapeContainer : {}]}
				onLayout={this.handleLayout}
			>
				<Provider store={store}>
					<AppContainer
						ref={(navigatorRef) => {
							Navigation.setTopLevelNavigator(navigatorRef);
						}}
						onNavigationStateChange={onNavigationStateChange}
					/>
				</Provider>
			</View>
		);
	}
}

export default Root;
