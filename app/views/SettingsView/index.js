import React, { Component } from 'react';
import {
	View, Linking, ScrollView, AsyncStorage
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { SafeAreaView } from 'react-navigation';
import { Answers } from 'react-native-fabric';

import { DrawerButton } from '../../containers/HeaderButton';
import StatusBar from '../../containers/StatusBar';
import { getReadableVersion, getDeviceModel } from '../../utils/deviceInfo';
import I18n from '../../i18n';
import { MARKDOWN_KEY } from '../../lib/rocketchat';
import styles from './styles';
import openLink from '../../utils/openLink';
import scrollPersistTaps from '../../utils/scrollPersistTaps';
import { toggleMarkdown as toggleMarkdownAction } from '../../actions/markdown';
import Button from './Button';
import ButtonWithSwitch from './ButtonWithSwitch';

const LICENSE_LINK = 'https://github.com/RocketChat/Rocket.Chat.ReactNative/blob/develop/LICENSE';

@connect(state => ({
	server: state.server,
	useMarkdown: state.markdown.useMarkdown
}), dispatch => ({
	toggleMarkdown: params => dispatch(toggleMarkdownAction(params))
}))

export default class SettingsView extends Component {
	static navigationOptions = ({ navigation }) => ({
		headerLeft: <DrawerButton navigation={navigation} />,
		title: I18n.t('Settings')
	});

	static propTypes = {
		navigation: PropTypes.object,
		server:	PropTypes.object,
		useMarkdown: PropTypes.bool,
		toggleMarkdown: PropTypes.func
	}

	toggleMarkdown = (value) => {
		AsyncStorage.setItem(MARKDOWN_KEY, JSON.stringify(value));
		const { toggleMarkdown } = this.props;
		toggleMarkdown(value);
		Answers.logCustom('toggle_markdown', { value });
	}

	navigateToRoom = (room) => {
		const { navigation } = this.props;
		return () => navigation.navigate(room);
	}

	sendEmail = () => {
		const subject = encodeURI('React Native App Support');
		const email = encodeURI('support@rocket.chat');
		const description = encodeURI(`
			version: ${ getReadableVersion }
			device: ${ getDeviceModel }
		`);
		Linking.openURL(`mailto:${ email }?subject=${ subject }&body=${ description }`);
	}

	openLink = link => () => openLink(link)

	renderSectionSeparator = () => <View style={styles.sectionSeparatorBorder} />;

	renderSeparator = () => <View style={styles.separator} />;

	render() {
		const { server, useMarkdown } = this.props;
		return (
			<SafeAreaView style={styles.container} forceInset={{ bottom: 'never' }}>
				<StatusBar />
				<ScrollView
					{...scrollPersistTaps}
					contentContainerStyle={styles.contentContainer}
					showsVerticalScrollIndicator={false}
				>
					{this.renderSectionSeparator()}

					<Button title={I18n.t('Contact_us')} onPress={this.sendEmail} showActionIndicator />
					{this.renderSeparator()}
					<Button title={I18n.t('Language')} onPress={this.navigateToRoom('LanguageView')} showActionIndicator />
					{this.renderSeparator()}
					<Button title={I18n.t('Theme')} showActionIndicator disable />
					{this.renderSeparator()}
					<Button title={I18n.t('Share_this_app')} showActionIndicator disable />

					{this.renderSectionSeparator()}

					<Button title={I18n.t('License')} onPress={this.openLink(LICENSE_LINK)} showActionIndicator />
					{this.renderSeparator()}
					<Button title={I18n.t('Version_no', { version: getReadableVersion })} />
					{this.renderSeparator()}
					<Button title={I18n.t('Server_version', { version: server.version })} subTitle={`${ server.server.split('//')[1] }`} />

					{this.renderSectionSeparator()}

					<ButtonWithSwitch title={I18n.t('Enable_markdown')} value={useMarkdown} onValueChange={this.toggleMarkdown} />
					{this.renderSeparator()}
					<Button title={I18n.t('Crash_report_disclaimer')} disable />

					{this.renderSectionSeparator()}
				</ScrollView>
			</SafeAreaView>
		);
	}
}
