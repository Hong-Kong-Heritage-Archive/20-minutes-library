import React from "react";
import {
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Dialog,
  DialogActions,
} from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useTranslation } from "react-i18next";

// Fix for default icon issue with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Use:
/*
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
*/

interface MapProps {
  open: boolean;
  closeEvent: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
  location?: { latitude: number; longitude: number } | null;
}

const Map: React.FC<MapProps> = ({ open, closeEvent, location }) => {
  const { t } = useTranslation();

  const handleCloseMapDialog = () => {
    closeEvent({}, "escapeKeyDown"); // Or "backdropClick" depending on how you want to signal
  };

  return (
    <Dialog open={open} onClose={closeEvent}>
      <DialogTitle>{t("location.myLocation")}</DialogTitle>
      <DialogContent sx={{ height: "60vh", width: "60vw", padding: 0 }}>
        {" "}
        {/* Adjust height as needed */}
        {location ? (
          <MapContainer
            center={[location.latitude, location.longitude]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[location.latitude, location.longitude]}>
              <Popup>
                {t("location.here")} <br /> {t("location.latitude")}: {location.latitude}, {t("location.longitude")}:{" "}
                {location.longitude}
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <Typography>{t("location.notAvailable")}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseMapDialog}>{t("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default Map;
