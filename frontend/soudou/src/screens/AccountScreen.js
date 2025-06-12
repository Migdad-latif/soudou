import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  ActivityIndicator,
  FlatList,
  Alert,
  Switch,
  Linking,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import i18n from '../localization/i18n';
import { useLanguage } from '../localization/i18n';

const API_BASE_URL = 'http://192.168.1.214:3000/api';
const CARD_WIDTH = '92%';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' }
];

function LanguageSelector() {
  const [modalVisible, setModalVisible] = useState(false);
  const { language, setLanguage } = useLanguage();
  const handleSelect = async (code) => {
    await setLanguage(code);
    setModalVisible(false);
  };
  return (
    <View style={{ width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 8, marginBottom: 15, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, elevation: 2 }}>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
        <Text style={{ fontSize: 16, color: '#333', flex: 1 }}>{i18n.t('changeLanguage') || 'Change Language'}</Text>
        <Text style={{ fontSize: 15, color: '#007AFF', marginRight: 8 }}>
          {LANGUAGES.find(l => l.code === language)?.label || language}
        </Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.langModalOverlay}>
          <View style={styles.langModalContent}>
            <Text style={styles.modalTitle}>{i18n.t('changeLanguage') || 'Change Language'}</Text>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langOption,
                  language === lang.code && styles.langOptionSelected
                ]}
                onPress={() => handleSelect(lang.code)}
              >
                <Text style={styles.langOptionText}>{lang.label}</Text>
                {language === lang.code ? <Text style={{ color: "#00c3a5" }}>✓</Text> : null}
              </TouchableOpacity>
            ))}
            <Button title={i18n.t('cancel') || "Cancel"} onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProfileCard({ user, onEdit }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>{i18n.t('account')}</Text>
      <Text style={styles.cardLabel}>{i18n.t('welcome')}</Text>
      <Text style={[styles.cardValue, { marginBottom: 8 }]}>
        {user?.name || '-'}
      </Text>
      <Text style={styles.cardLabel}>{i18n.t('email')}</Text>
      <Text style={styles.cardValue}>{user?.email || '-'}</Text>
      <Text style={styles.cardLabel}>{i18n.t('phone')}</Text>
      <Text style={styles.cardValue}>{user?.phoneNumber || '-'}</Text>
      <TouchableOpacity style={styles.editButton} onPress={onEdit}>
        <Text style={styles.editButtonText}>{i18n.t('editProfile') || "Edit Profile"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SettingsCard() {
  const { user, token, logout, updatePhoneNumber } = useAuth();

  // Account settings
  const [phoneModal, setPhoneModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [currentPasswordForPhone, setCurrentPasswordForPhone] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [currentPasswordForPass, setCurrentPasswordForPass] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Privacy settings
  const [privacyModal, setPrivacyModal] = useState(false);
  const [showProfile, setShowProfile] = useState(true);
  const [shareUsage, setShareUsage] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const handleChangePhone = async () => {
    if (!newPhone || !currentPasswordForPhone) {
      Alert.alert(i18n.t('error'), i18n.t('missingFields') || 'Please enter new phone and current password.');
      return;
    }
    setPhoneLoading(true);
    const result = await updatePhoneNumber(newPhone, currentPasswordForPhone);
    setPhoneLoading(false);
    setNewPhone('');
    setCurrentPasswordForPhone('');
    if (result.success) {
      Alert.alert(i18n.t('success'), i18n.t('phoneUpdated') || 'Phone number updated!');
      setPhoneModal(false);
    } else {
      Alert.alert(i18n.t('error'), result.error || i18n.t('failedToUpdatePhone') || 'Failed to update phone number');
    }
  };

  const clearPasswordFields = () => {
    setCurrentPasswordForPass('');
    setNewPassword('');
    setNewPasswordConfirm('');
  };

  const handleChangePassword = async () => {
    if (!currentPasswordForPass || !newPassword || !newPasswordConfirm) {
      Alert.alert(i18n.t('error'), i18n.t('missingFields') || 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(i18n.t('error'), i18n.t('passwordLengthError') || 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      Alert.alert(i18n.t('error'), i18n.t('passwordsDoNotMatch') || 'Passwords do not match');
      return;
    }
    setPassLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.put(`${API_BASE_URL}/auth/change-password`, {
        currentPassword: currentPasswordForPass,
        newPassword,
      }, { headers });
      if (res.data.success) {
        Alert.alert(i18n.t('success'), i18n.t('passwordUpdated') || 'Password updated successfully!');
      } else {
        Alert.alert(i18n.t('error'), res.data.error || i18n.t('failedToUpdatePassword') || 'Failed to update password');
      }
      setPasswordModal(false);
      clearPasswordFields();
    } catch (err) {
      Alert.alert(
        i18n.t('error'),
        err.response?.data?.error || i18n.t('failedToUpdatePassword') || 'Failed to update password'
      );
      setPasswordModal(false);
      clearPasswordFields();
    } finally {
      setPassLoading(false);
    }
  };

  const handleCancelPassword = () => {
    setPasswordModal(false);
    clearPasswordFields();
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.delete(`${API_BASE_URL}/auth/me`, { headers });
      if (res.data.success) {
        Alert.alert(i18n.t('success'), i18n.t('accountDeleted') || 'Your account has been deleted.');
        await logout();
      } else {
        Alert.alert(i18n.t('error'), res.data.error || i18n.t('failedToDeleteAccount') || 'Failed to delete account');
      }
    } catch (err) {
      Alert.alert(
        i18n.t('error'),
        err.response?.data?.error || i18n.t('failedToDeleteAccount') || 'Failed to delete account'
      );
    } finally {
      setDeleteLoading(false);
      setDeleteModal(false);
    }
  };

  const handleSavePrivacy = () => {
    setSavingPrivacy(true);
    setTimeout(() => {
      setSavingPrivacy(false);
      setPrivacyModal(false);
      Alert.alert(i18n.t('success'), i18n.t('privacySettingsSaved') || 'Your privacy settings have been saved.');
    }, 1200);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>{i18n.t('appSettings')}</Text>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setPhoneModal(true)}
      >
        <Text style={styles.optionText}>{i18n.t('changePhoneNumber') || 'Change Phone Number'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setPasswordModal(true)}
      >
        <Text style={styles.optionText}>{i18n.t('changePassword') || 'Change Password'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setPrivacyModal(true)}
      >
        <Text style={styles.optionText}>{i18n.t('privacySettings')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.optionButton, { borderBottomWidth: 0 }]}
        onPress={() => setDeleteModal(true)}
      >
        <Text style={[styles.optionText, { color: '#dc3545' }]}>
          {i18n.t('deleteAccount') || 'Delete Account'}
        </Text>
      </TouchableOpacity>
      {/* Change Phone Modal */}
      <Modal
        visible={phoneModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setPhoneModal(false);
          setNewPhone('');
          setCurrentPasswordForPhone('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('changePhoneNumber') || 'Change Phone Number'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={i18n.t('newPhoneNumber') || "New Phone Number"}
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />
            <TextInput
              style={styles.modalInput}
              placeholder={i18n.t('currentPassword') || "Current Password"}
              secureTextEntry
              value={currentPasswordForPhone}
              onChangeText={setCurrentPasswordForPhone}
            />
            <View style={styles.modalBtnRow}>
              <Button title={i18n.t('cancel') || "Cancel"} onPress={() => {
                setPhoneModal(false);
                setNewPhone('');
                setCurrentPasswordForPhone('');
              }} />
              <Button
                title={phoneLoading ? (i18n.t('saving') || 'Saving...') : (i18n.t('update') || 'Update')}
                onPress={handleChangePhone}
                disabled={phoneLoading}
              />
            </View>
          </View>
        </View>
      </Modal>
      {/* Change Password Modal */}
      <Modal
        visible={passwordModal}
        animationType="slide"
        transparent
        onRequestClose={handleCancelPassword}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('changePassword') || 'Change Password'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={i18n.t('currentPassword') || "Current Password"}
              secureTextEntry
              value={currentPasswordForPass}
              onChangeText={setCurrentPasswordForPass}
            />
            <TextInput
              style={styles.modalInput}
              placeholder={i18n.t('newPassword') || "New Password"}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder={i18n.t('confirmNewPassword') || "Confirm New Password"}
              secureTextEntry
              value={newPasswordConfirm}
              onChangeText={setNewPasswordConfirm}
            />
            <View style={styles.modalBtnRow}>
              <Button title={i18n.t('cancel') || "Cancel"} onPress={handleCancelPassword} />
              <Button
                title={passLoading ? (i18n.t('saving') || 'Saving...') : (i18n.t('update') || 'Update')}
                onPress={handleChangePassword}
                disabled={passLoading}
              />
            </View>
          </View>
        </View>
      </Modal>
      {/* Privacy Settings Modal */}
      <Modal
        visible={privacyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('privacySettings')}</Text>
            <View style={styles.privacyRow}>
              <Text style={styles.privacyLabel}>{i18n.t('showProfileToOthers') || 'Show my profile to others'}</Text>
              <Switch
                value={showProfile}
                onValueChange={setShowProfile}
              />
            </View>
            <View style={styles.privacyRow}>
              <Text style={styles.privacyLabel}>{i18n.t('shareAnonymousUsageData') || 'Share anonymous usage data'}</Text>
              <Switch
                value={shareUsage}
                onValueChange={setShareUsage}
              />
            </View>
            <View style={styles.modalBtnRow}>
              <Button title={i18n.t('cancel') || "Cancel"} onPress={() => setPrivacyModal(false)} />
              <Button
                title={savingPrivacy ? (i18n.t('saving') || "Saving...") : (i18n.t('save') || "Save")}
                onPress={handleSavePrivacy}
                disabled={savingPrivacy}
              />
            </View>
          </View>
        </View>
      </Modal>
      {/* Delete Account Modal */}
      <Modal
        visible={deleteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#dc3545' }]}>
              {i18n.t('deleteAccount') || 'Delete Account'}
            </Text>
            <Text style={{ marginBottom: 20 }}>
              {i18n.t('deleteConfirmation') || 'Are you sure you want to delete your account? This action cannot be undone.'}
            </Text>
            <View style={styles.modalBtnRow}>
              <Button title={i18n.t('cancel') || "Cancel"} onPress={() => setDeleteModal(false)} />
              <Button
                title={deleteLoading ? (i18n.t('deleting') || 'Deleting...') : (i18n.t('delete') || 'Delete')}
                onPress={handleDeleteAccount}
                color="#dc3545"
                disabled={deleteLoading}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SupportCard() {
  const [modalVisible, setModalVisible] = useState(false);
  const [improvementText, setImprovementText] = useState('');
  const [sending, setSending] = useState(false);
  const [faqModal, setFaqModal] = useState(false);

  const handleSendImprovement = async () => {
    if (!improvementText.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('pleaseEnterSuggestion') || 'Please enter your suggestion.');
      return;
    }
    setSending(true);
    const subject = encodeURIComponent(i18n.t('improvementSubject') || 'App Improvement Suggestion');
    const body = encodeURIComponent(improvementText);
    const mailtoUrl = `mailto:mamaou_diallo@hotmail.co.uk?subject=${subject}&body=${body}`;
    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        Linking.openURL(mailtoUrl);
        setModalVisible(false);
        setImprovementText('');
      } else {
        Alert.alert(i18n.t('error'), i18n.t('noEmailAppFound') || 'No email app found');
      }
    } catch (err) {
      Alert.alert(i18n.t('error'), i18n.t('couldNotOpenEmailApp') || 'Could not open email app.');
    } finally {
      setSending(false);
    }
  };

  const faqList = [
    {
      question: i18n.t('faqSearchPropertyQ') || "How do I search for a property?",
      answer: i18n.t('faqSearchPropertyA') || "Tap the Search tab and enter your criteria, such as location, price, or property type. Results will update as you change your filters."
    },
    {
      question: i18n.t('faqSavePropertyQ') || "How do I save a property I like?",
      answer: i18n.t('faqSavePropertyA') || "When viewing a property, tap the heart icon to add it to your saved list. You can view all your saved properties in your account."
    },
    {
      question: i18n.t('faqContactAgentQ') || "How do I contact a property agent?",
      answer: i18n.t('faqContactAgentA') || "On each property page, you'll find a 'Contact Agent' button. Tap it to send a message or call the agent directly."
    },
    {
      question: i18n.t('faqListPropertyQ') || "Can I list my property for sale or rent on Soudou?",
      answer: i18n.t('faqListPropertyA') || "Yes! Go to your account and tap 'List a Property' to begin. Follow the guided steps to provide details, photos, and your contact info."
    },
    {
      question: i18n.t('faqChangeAccountQ') || "How do I change my account details?",
      answer: i18n.t('faqChangeAccountA') || "Go to Account > Edit Profile to update your name, email, or other information. Use the Settings menu to change your phone or password."
    },
    {
      question: i18n.t('faqForgotPasswordQ') || "What should I do if I forget my password?",
      answer: i18n.t('faqForgotPasswordA') || "On the login screen, tap 'Forgot Password?' and follow the instructions to reset your password via email or SMS."
    }
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{i18n.t('support')}</Text>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.optionText}>{i18n.t('suggestImprovement')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setFaqModal(true)}
      >
        <Text style={styles.optionText}>{i18n.t('faqs')}</Text>
      </TouchableOpacity>
      {/* Suggest Improvement Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('suggestImprovement')}</Text>
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder={i18n.t('typeYourSuggestion') || "Type your suggestion here..."}
              value={improvementText}
              onChangeText={setImprovementText}
              multiline
              maxLength={1000}
            />
            <View style={styles.modalBtnRow}>
              <Button title={i18n.t('cancel') || "Cancel"} onPress={() => { setModalVisible(false); setImprovementText(''); }} />
              <Button
                title={sending ? (i18n.t('sending') || "Sending...") : (i18n.t('send') || "Send")}
                onPress={handleSendImprovement}
                disabled={sending}
              />
            </View>
          </View>
        </View>
      </Modal>
      {/* FAQs Modal */}
      <Modal
        visible={faqModal}
        animationType="slide"
        transparent
        onRequestClose={() => setFaqModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>{i18n.t('faqs')} - Soudou Real Estate App</Text>
              {faqList.map((faq, idx) => (
                <View key={idx} style={{ marginBottom: 18 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>{faq.question}</Text>
                  <Text style={{ color: '#333', fontSize: 15 }}>{faq.answer}</Text>
                </View>
              ))}
            </ScrollView>
            <Button title={i18n.t('close') || "Close"} onPress={() => setFaqModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LegalCard() {
  const [termsModal, setTermsModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);

  const termsText = i18n.t('termsOfUseText');
  const privacyText = i18n.t('privacyPolicyText');

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{i18n.t('legal')}</Text>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setTermsModal(true)}
      >
        <Text style={styles.optionText}>{i18n.t('termsOfUse')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setPrivacyModal(true)}
      >
        <Text style={styles.optionText}>{i18n.t('privacyPolicy')}</Text>
      </TouchableOpacity>
      {/* Terms of Use Modal */}
      <Modal
        visible={termsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>{i18n.t('termsOfUse')}</Text>
              <Text style={{ marginBottom: 20, color: '#333' }}>{termsText}</Text>
            </ScrollView>
            <Button title={i18n.t('close') || "Close"} onPress={() => setTermsModal(false)} />
          </View>
        </View>
      </Modal>
      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>{i18n.t('privacyPolicy')}</Text>
              <Text style={{ marginBottom: 20, color: '#333' }}>{privacyText}</Text>
            </ScrollView>
            <Button title={i18n.t('close') || "Close"} onPress={() => setPrivacyModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SignInCard({ onSignIn, onRegister }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>{i18n.t('signIn')}</Text>
      <Text style={styles.cardDescription}>
        {i18n.t('signInDescription') || 'Save properties. Save searches. And set up alerts for when something new hits the market.'}
      </Text>
      <TouchableOpacity style={styles.signInButton} onPress={onSignIn}>
        <Text style={styles.signInButtonText}>{i18n.t('signIn')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRegister}>
        <Text style={styles.createAccountLink}>{i18n.t('createAccount')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, setUser, logout, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();

  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpenModal = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/auth/me`,
        { name: editName, email: editEmail }
      );
      setUser(response.data.user);
      setModalVisible(false);
    } catch (err) {
      alert(i18n.t('failedToUpdateProfile') || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      alert(i18n.t('loggedOut') || 'Logged out successfully!');
    } else {
      alert(result.error);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>{i18n.t('loadingAuth')}</Text>
      </View>
    );
  }

  const ListFooter = () =>
    user ? (
      <View style={styles.logoutFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{i18n.t('logout')}</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  const ListHeader = () => (
    <View style={styles.listHeaderContainer}>
      <Text style={styles.header}>{i18n.t('account')}</Text>
      <LanguageSelector />
      {user ? (
        <>
          <ProfileCard user={user} onEdit={handleOpenModal} />
          <SettingsCard />
        </>
      ) : (
        <SignInCard
          onSignIn={() => navigation.navigate('Login')}
          onRegister={() => navigation.navigate('Register')}
        />
      )}
      <SupportCard />
      <LegalCard />
      <Text style={styles.appVersion}>{i18n.t('appVersion') || "App version 1.0.0"}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        data={[]}
        keyExtractor={(_, index) => String(index)}
        renderItem={null}
        contentContainerStyle={styles.flatListContentContainer}
        showsVerticalScrollIndicator={false}
      />
      {/* Profile Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('editProfile') || "Edit Profile"}</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder={i18n.t('name') || "Name"}
            />
            <TextInput
              style={styles.modalInput}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder={i18n.t('email') || "Email"}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalBtnRow}>
              <Button title={i18n.t('cancel') || "Cancel"} onPress={() => setModalVisible(false)} />
              <Button title={saving ? (i18n.t('saving') || "Saving...") : (i18n.t('save') || "Save")} onPress={handleSave} disabled={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  flatListContentContainer: { paddingTop: 50, paddingBottom: 20 },
  listHeaderContainer: { width: '100%', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 20, marginHorizontal: 0, marginBottom: 15,
    width: CARD_WIDTH, alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  cardHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#002f3d' },
  cardLabel: { fontSize: 14, color: '#888', marginTop: 10 },
  cardValue: { fontSize: 16, color: '#333', marginBottom: 2 },
  editButton: { marginTop: 16, backgroundColor: '#007bff', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, alignItems: 'center', alignSelf: 'flex-start' },
  editButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  signInButton: { width: '100%', padding: 15, backgroundColor: '#00c3a5', borderRadius: 8, alignItems: 'center' },
  signInButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  createAccountLink: { fontSize: 16, color: '#007bff', fontWeight: 'bold', paddingVertical: 5 },
  logoutFooter: { width: '100%', alignItems: 'center', marginTop: 10, marginBottom: 30 },
  logoutButton: { width: CARD_WIDTH, padding: 15, backgroundColor: '#dc3545', borderRadius: 8, alignItems: 'center' },
  logoutButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  section: { width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 8, padding: 20, marginHorizontal: 0, marginBottom: 15, alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#888', marginBottom: 10, textTransform: 'uppercase' },
  optionButton: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%' },
  optionText: { fontSize: 16, color: '#333' },
  appVersion: { fontSize: 14, color: '#888', marginTop: 20, marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '86%', backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', elevation: 8 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 22, color: '#002f3d' },
  modalInput: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 16 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 12,
  },
  privacyLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  langModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  langModalContent: { width: '82%', backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', elevation: 8 },
  langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingVertical: 13, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  langOptionText: { fontSize: 16, color: '#222' },
  langOptionSelected: { backgroundColor: '#e6fff6' },
});