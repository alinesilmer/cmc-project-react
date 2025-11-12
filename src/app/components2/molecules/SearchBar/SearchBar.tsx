"use client";

import type React from "react";
import { Search } from "lucide-react";
import Input from "../../atoms/Input/Input";
import styles from "./SearchBar.module.scss";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Buscar...",
  value,
  onChange,
  className = "",
}) => {
  return (
    <div className={`${styles.searchBar} ${className}`}>
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        icon={<Search size={18} />}
      />
    </div>
  );
};

export default SearchBar;
