import React, {useEffect, useState} from 'react';
import {AccessibilityInfo, ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {COLORS} from '../constants/theme';
export const ui = StyleSheet.create({
  screen:{flex:1,backgroundColor:COLORS.background}, content:{padding:16,gap:16,paddingBottom:28},
  card:{backgroundColor:'#FFFFFF',borderRadius:14,padding:16,gap:12,borderWidth:1,borderColor:COLORS.border},
  title:{fontSize:26,fontWeight:'700',color:COLORS.textPrimary}, heading:{fontSize:20,fontWeight:'700',color:COLORS.textPrimary},
  text:{fontSize:16,lineHeight:23,color:COLORS.textPrimary}, muted:{fontSize:14,lineHeight:21,color:COLORS.textSecondary},
  row:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}, between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  label:{fontSize:14,fontWeight:'600',color:COLORS.textPrimary}, input:{minHeight:48,padding:12,borderRadius:10,borderWidth:1,borderColor:'#A6B6A9',backgroundColor:'#FFF',fontSize:16,color:COLORS.textPrimary},
  footer:{padding:16,gap:8,backgroundColor:'#FFF',borderTopWidth:1,borderColor:COLORS.border},
});
export function Screen({children, scroll = true, bottom = true}: {children: React.ReactNode; scroll?: boolean; bottom?: boolean}) {
 return <SafeAreaView style={ui.screen} edges={bottom?['top','bottom']:['top']}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>{scroll?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>{children}</ScrollView>:children}</KeyboardAvoidingView></SafeAreaView>;
}
export function Button({title,onPress,loading=false,disabled=false,secondary=false}: {title:string;onPress:()=>void;loading?:boolean;disabled?:boolean;secondary?:boolean}) {
 const unavailable=disabled||loading;
 return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:unavailable,busy:loading}} disabled={unavailable} onPress={onPress} style={({pressed})=>({minHeight:48,padding:12,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:unavailable?'#E1E8E2':secondary?'#EAF3ED':COLORS.primaryDark,opacity:pressed?0.8:1})}>{loading?<ActivityIndicator color={COLORS.primaryDark}/>:<Text style={{fontSize:16,fontWeight:'600',color:unavailable?'#4A554D':secondary?COLORS.primaryDark:'#FFF'}}>{title}</Text>}</Pressable>;
}
export function Chip({label,selected=false,onPress}: {label:string;selected?:boolean;onPress:()=>void}) {
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} onPress={onPress} style={{minHeight:48,paddingHorizontal:14,paddingVertical:12,borderRadius:24,borderWidth:1,borderColor:COLORS.primaryDark,backgroundColor:selected?COLORS.primaryDark:'#FFF',justifyContent:'center'}}><Text style={{fontSize:14,color:selected?'#FFF':COLORS.primaryDark,fontWeight:'600'}}>{label}</Text></Pressable>;
}
export function Field({label,value,onChangeText,error,...props}: {label:string;value:string;onChangeText:NonNullable<React.ComponentProps<typeof TextInput>['onChangeText']>;error?:string} & React.ComponentProps<typeof TextInput>) {
 return <View style={{gap:6}}><Text style={ui.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} accessibilityHint={error} style={[ui.input,props.style]} value={value} onChangeText={onChangeText}/>{error?<Text accessibilityRole="alert" style={{color:COLORS.danger,fontSize:14}}>{error}</Text>:null}</View>;
}
export function Notice({title,body,action,onAction}: {title:string;body?:string;action?:string;onAction?:()=>void}) {
 return <View style={ui.card} accessibilityLiveRegion="polite"><Text style={ui.heading}>{title}</Text>{body?<Text style={ui.muted}>{body}</Text>:null}{action&&onAction?<Button title={action} onPress={onAction} secondary/>:null}</View>;
}
export function Loading({label='Loading…'}:{label?:string}) { return <View accessibilityLiveRegion="polite" style={{padding:24,gap:12}}><ActivityIndicator color={COLORS.primaryDark}/><Text style={[ui.muted,{textAlign:'center'}]}>{label}</Text>{[0,1].map(i=><View key={i} style={{height:70,backgroundColor:'#E5ECE6',borderRadius:14}}/>)}</View>; }
export function DemoNotice(){return <Text style={[ui.muted,{color:COLORS.primaryDark}]}>Demo booking environment · no money charged</Text>;}
export function Sheet({visible,title,onClose,children}: {visible:boolean;title:string;onClose:()=>void;children:React.ReactNode}) {
 const [reduceMotion,setReduceMotion]=useState(true);
 useEffect(()=>{AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);return()=>sub.remove();},[]);
 return <Modal visible={visible} animationType={reduceMotion?'none':'slide'} onRequestClose={onClose}><SafeAreaView style={ui.screen} accessibilityViewIsModal><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}><View style={[ui.between,{padding:16}]}><Text accessibilityRole="header" style={[ui.heading,{flex:1}]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'}}><Ionicons name="close" size={26}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>{children}</ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>;
}
