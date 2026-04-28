import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Empresa } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  empresa: Empresa | null;
  refreshEmpresa: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  const isAdmin = user?.email?.toLowerCase().trim() === 'alex.b19h@gmail.com' || user?.email?.toLowerCase().trim() === 'alexander23sanchezaragon@gmail.com';

  const fetchEmpresa = async () => {
    if (!user) return;
    try {
      const empresaDoc = await getDoc(doc(db, 'empresa', 'config'));
      if (empresaDoc.exists()) {
        setEmpresa({ id: empresaDoc.id, ...empresaDoc.data() } as Empresa);
      } else if (isAdmin) {
        const initialEmpresa: Empresa = {
          nombre: 'Distribuidora QUE POLLO',
          nit: '',
          direccion: '',
          telefono: '317 331 5203',
          correo: '',
          logoUrl: '',
          consecutivoCompra: 1,
          consecutivoVenta: 1,
        };
        try {
          await setDoc(doc(db, 'empresa', 'config'), initialEmpresa);
          setEmpresa(initialEmpresa);
        } catch (setErr: any) {
          console.error('Error creating initial empresa:', setErr.message);
        }
      }
    } catch (error: any) {
      console.warn('Error fetching empresa:', error.message);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      
      setUser(user);
      if (user) {
        await fetchEmpresa();
      } else {
        setEmpresa(null);
      }
      setLoading(false);
    });
    return () => { isMounted = false; unsubscribe(); };
  }, [isAdmin]);

  const refreshEmpresa = async () => {
    await fetchEmpresa();
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, empresa, refreshEmpresa, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
