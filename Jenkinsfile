pipeline {
    agent any

    environment {
        GRADLE_OPTS = '-Dorg.gradle.daemon=false'
    }

    stages {
        stage('Verify Environment') {
            steps {
                echo 'Checking Java, Node and NPM versions...'
                script {
                    if (isUnix()) {
                        sh 'java -version'
                        sh 'node --version'
                        sh 'npm --version'
                    } else {
                        bat 'java -version'
                        bat 'node --version'
                        bat 'npm --version'
                    }
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                echo 'Installing npm packages in frontend directory...'
                dir('frontend') {
                    script {
                        if (isUnix()) {
                            sh 'npm install'
                        } else {
                            bat 'npm install'
                        }
                    }
                }
            }
        }

        stage('Build & Test Application') {
            steps {
                echo 'Executing Gradle clean build (automates React build, copies assets, and tests backend)...'
                script {
                    if (isUnix()) {
                        sh 'chmod +x gradlew'
                        sh './gradlew clean build'
                    } else {
                        bat 'gradlew.bat clean build'
                    }
                }
            }
        }

        stage('Publish Test Reports') {
            post {
                always {
                    echo 'Publishing unit test results...'
                    junit 'build/test-results/test/*.xml'
                }
            }
        }
    }

    post {
        success {
            echo 'CI/CD pipeline completed successfully!'
            archiveArtifacts artifacts: 'build/libs/*.jar', followSymlinks: false
        }
        failure {
            echo 'CI/CD pipeline failed. Please check the stage logs.'
        }
    }
}
