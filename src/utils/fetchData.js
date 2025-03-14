// utils/fetchData.js
import { supabase } from "../supabaseClient";

export const fetchSalesData = async () => {
  const { data, error } = await supabase.from("Sale").select("*");
  if (error) throw error;
  return data;
};

export const fetchLocationsData = async () => {
  const { data, error } = await supabase.from("Location").select("*");
  if (error) throw error;
  return data;
};

export const fetchImportsData = async () => {
  const { data, error } = await supabase.from("Import").select("*");
  if (error) throw error;
  return data;
};