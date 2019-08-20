#!/bin/bash
./gradlew assembleRelease -Dorg.gradle.project.KEYSTORE=/home/socba/edchatdev.jks -Dorg.gradle.project.KEYSTORE_PASSWORD=toilahacker -Dorg.gradle.project.KEY_ALIAS=edchatdev -Dorg.gradle.project.KEY_PASSWORD=toilahacker
