import React, { createContext, useContext, useState } from 'react';

type UserType = 'employer' | 'employee' | 'guest';
type UserTypeContextType = {
  userType: UserType;
  setUserType: (type: UserType) => void;
};

const UserTypeContext = createContext<UserTypeContextType | undefined>(undefined);

export const UserTypeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage or default to employee (candidate)
  const [userType, setUserTypeState] = useState<UserType>(() => {
    const saved = localStorage.getItem('userType') as UserType;
    return (saved === 'employer' || saved === 'employee' || saved === 'guest') ? saved : 'employee';
  });

  const setUserType = (type: UserType) => {
    setUserTypeState(type);
    localStorage.setItem('userType', type);
  };

  return (
    <UserTypeContext.Provider value={{ userType, setUserType }}>
      {children}
    </UserTypeContext.Provider>
  );
};

export const useUserType = () => {
  const context = useContext(UserTypeContext);
  if (!context) {
    throw new Error('useUserType must be used within a UserTypeProvider');
  }
  return context;
};