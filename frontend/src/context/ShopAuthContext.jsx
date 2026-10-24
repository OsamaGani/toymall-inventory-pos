import { createContext, useContext, useEffect, useState } from "react";

const ShopAuthContext = createContext(null);

const SHOP_TOKEN_KEY = "toymall_shop_token";
const SHOP_DATA_KEY = "toymall_shop";

export function ShopAuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem(SHOP_TOKEN_KEY)
  );

  const [shop, setShop] = useState(() => {
    const savedShop = localStorage.getItem(SHOP_DATA_KEY);

    if (!savedShop) {
      return null;
    }

    try {
      return JSON.parse(savedShop);
    } catch {
      localStorage.removeItem(SHOP_DATA_KEY);
      return null;
    }
  });

  const login = (shopToken, shopData) => {
    localStorage.setItem(SHOP_TOKEN_KEY, shopToken);
    localStorage.setItem(SHOP_DATA_KEY, JSON.stringify(shopData));

    setToken(shopToken);
    setShop(shopData);
  };

  const logout = () => {
    localStorage.removeItem(SHOP_TOKEN_KEY);
    localStorage.removeItem(SHOP_DATA_KEY);

    setToken(null);
    setShop(null);
  };

  const isAuthenticated = Boolean(token && shop);

  useEffect(() => {
    if (!token || !shop) {
      return;
    }

    localStorage.setItem(SHOP_TOKEN_KEY, token);
    localStorage.setItem(SHOP_DATA_KEY, JSON.stringify(shop));
  }, [token, shop]);

  return (
    <ShopAuthContext.Provider
      value={{
        token,
        shop,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </ShopAuthContext.Provider>
  );
}

export function useShopAuth() {
  const context = useContext(ShopAuthContext);

  if (!context) {
    throw new Error(
      "useShopAuth must be used inside ShopAuthProvider"
    );
  }

  return context;
}