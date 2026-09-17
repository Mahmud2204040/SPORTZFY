import {useCallback,useRef,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {errorMessage} from '../utils/mobile';
export function useResource<T>(fetcher:()=>Promise<T>, enabled=true) {
 const [data,setData]=useState<T|null>(null),[loading,setLoading]=useState(enabled),[error,setError]=useState('');
 const generation=useRef(0);
 const refresh=useCallback(async()=>{
  if(!enabled)return;
  const id=++generation.current;setLoading(true);setError('');
  try{const next=await fetcher();if(id===generation.current)setData(next);}catch(e){if(id===generation.current)setError(errorMessage(e));}
  finally{if(id===generation.current)setLoading(false);}
 },[fetcher,enabled]);
 useFocusEffect(useCallback(()=>{setData(null);setError('');if(enabled)void refresh();else setLoading(false);return()=>{generation.current++;};},[refresh,enabled]));
 return {data,setData,loading,error,refresh};
}
