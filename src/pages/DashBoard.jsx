import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  getUserLocation,
  getAllBusStop,
  getStoredBusStop,
  getStoredBusStopData,
  getLtaAlert,
  sampleStatus2,
  getLocationName,
} from "../utils/busApi";
import BusCard from "../components/BusCard";
import DashBoardModal from "../components/DashBoardModal";
import AlertModal from "../components/AlertModal";

const DashBoard = () => {
  const [showModal, setShowModal] = useState(false);
  const [alertModal, setAlertModal] = useState(false);
  const [alertStatus, setAlertStatus] = useState(1);
  const [isTest, setIsTest] = useState(false);

  // --- GET USER LOCATION ---
  const userLocationQuery = useQuery({
    queryKey: ["userLocation"],
    queryFn: getUserLocation,
    enabled: false, // false to stop query
    staleTime: 60_000, // refresh every 60s
  });

  // --- GET ALL BUS STOPS DATA ---
  const allBusStopQuery = useQuery({
    queryKey: ["allBusStop"],
    queryFn: getAllBusStop,
  });

  // --- GET STORED BUS STOP FROM AIRTABLE ---
  const storedBusStopQuery = useQuery({
    queryKey: ["storedBusStop"],
    queryFn: getStoredBusStop,
    staleTime: 600_000,
    enabled: true,
  });
  const storedBusStopData =
    storedBusStopQuery.data?.records?.map((record) => ({
      id: record.id,
      busCode: record.fields?.BusCodeStored || "N/A",
      type: record.fields?.Type || "unknown",
    })) ?? [];

  const storedStopQuery = useQuery({
    queryKey: [
      "storedBusStopWithServices",
      storedBusStopData.map((item) => item.busCode).join("|"),
    ],
    queryFn: () =>
      getStoredBusStopData(
        storedBusStopData,
        import.meta.env.VITE_ACCKEY,
        allBusStopQuery.data,
        userLocationQuery.data?.latitude ?? 1.3,
        userLocationQuery.data?.longitude ?? 103.84,
      ),
    staleTime: 60_000,
    enabled: storedBusStopData.length > 0 && !!allBusStopQuery.data,
  });

  const storedStopData = storedStopQuery.data
    ? [...storedStopQuery.data].sort((a, b) => a.distanceKm - b.distanceKm)
    : [];

  // --- GET LTA ALERT ---
  const ltaAlertQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: getLtaAlert,
    enabled: true,
    staleTime: 60_000,
  });

  // this is toggle demo and live
  const toggleTest = () => {
    setIsTest(!isTest);
  };

  const ltaAlert = isTest ? sampleStatus2 : (ltaAlertQuery.data?.value ?? null);

  useEffect(() => {
    if (!ltaAlert) return;
    if (ltaAlert.Status === 2) {
      setAlertStatus(2);
    } else if (ltaAlert.Status === 3) {
      setAlertStatus(3);
    } else {
      setAlertStatus(1);
    }
  }, [ltaAlert, isTest]);

  // --- GET LOCATION NAME ---
  const locationNameQuery = useQuery({
    queryKey: ["locationName"],
    queryFn: () =>
      getLocationName(
        userLocationQuery.data?.latitude,
        userLocationQuery.data?.longitude,
      ),
    enabled:
      !!userLocationQuery.data?.latitude && !!userLocationQuery.data?.longitude,
  });

  // --- RENDER ---

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-4 ">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        DASHBOARD
      </h1>
      <hr className="border-black-500" />
      <div className="flex flex-row gap-1 sm:gap-4 justify-evenly">
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 min-w-0 px-2 sm:px-4 py-2 bg-lime-300 text-green-900 text-[11px] sm:text-base hover:bg-green-700 rounded-md "
        >
          ADD BUS STOP
        </button>
        <button
          onClick={() => userLocationQuery.refetch()}
          className="flex-1 min-w-0 px-2 sm:px-4 py-2 bg-slate-700 text-white text-[11px] sm:text-base hover:bg-slate-300 rounded-md"
        >
          Refresh Location
        </button>
        <button
          onClick={toggleTest}
          className={
            "flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-white text-[11px] sm:text-base bg-slate-700 hover:bg-slate-300 "
          }
        >
          Test ALERT
        </button>
        <button
          onClick={() => setAlertModal(true)}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-md text-white text-[11px] sm:text-base hover:bg-blue-700  ${alertStatus === 2 || alertStatus === 3 ? "bg-red-500 animate-pulse" : "bg-blue-600"}`}
        >
          ALERT
        </button>
        {showModal && <DashBoardModal setShowModal={setShowModal} />}
        {alertModal && (
          <AlertModal
            setAlertModal={setAlertModal}
            setAlertStatus={setAlertStatus}
            status={ltaAlert.Status}
            affected={ltaAlert.AffectedSegments}
            message={ltaAlert.Message}
          />
        )}
      </div>

      {userLocationQuery.isLoading && (
        <p className="text-sm">Getting user Location</p>
      )}
      {ltaAlertQuery.isLoading && (
        <p className="text-sm text-gray-700">Loading alerts...</p>
      )}

      {ltaAlertQuery.isError && (
        <p className="text-sm text-red-600">
          Failed to load alerts. Please check connection or try again later.
        </p>
      )}
      {alertStatus === 2 ? (
        <p className="bg-red-500 text-olive-200">TRAIN DISRUPTION ALERT!!!!</p>
      ) : alertStatus === 3 ? (
        <p className="bg-orange-500 text-olive-200">
          TRAIN DISRUPTION = THIS IS DEMO MESSAGE
        </p>
      ) : (
        <p className="text-sm sm:text-base font-medium">
          no important alert yet...
        </p>
      )}
      {userLocationQuery.isSuccess && userLocationQuery.data ? (
        <p className="text-sm sm:text-base">
          {`Lat: ${userLocationQuery.data.latitude}, Long: ${userLocationQuery.data.longitude}, you should be around `}
          <span className="font-bold">
            {locationNameQuery.data?.display_name}
          </span>
        </p>
      ) : (
        <p className="text-sm sm:text-base text-gray-700">
          location not ON, using fallback location Plaza Singapura (lat:1.3,
          lon=103.84)
        </p>
      )}
      <hr className="border-gray-300 " />
      <div className="bg-[url('/backDrop.png')] bg-cover bg-fixed bg-center">
        <button
          onClick={() => storedStopQuery.refetch()}
          className="px-4 py-2 rounded-md bg-slate-700 text-white text-sm sm:text-base hover:bg-slate-800"
        >
          Refresh Stored Bus Stop
        </button>
        {storedBusStopQuery.isLoading && (
          <p className="text-sm">Refreshing your favourites</p>
        )}
        {/* Stored Bus Stops from Airtable - mapping section */}
        {storedStopQuery.isLoading && (
          <h3 className="text-base sm:text-lg font-semibold">
            Loading your favourites stops...
          </h3>
        )}
        {storedStopQuery.isError && (
          <h3 className="text-base sm:text-lg font-semibold text-red-600">
            {storedStopQuery.error?.message}
          </h3>
        )}
        {storedStopData.length > 0 && (
          <div className="space-y-3">
            {storedStopData.map((stop) => (
              <BusCard
                key={stop.id || stop.code}
                id={stop.id}
                stop={stop}
                code={stop.code}
                description1={stop.description1}
                services={stop.services}
                distanceKm={stop.distanceKm}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashBoard;
