package com.viarank.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class ActivityTrackingService extends Service implements LocationListener {

    private static final String CHANNEL_ID = "viarank_activity_tracking";
    private static final int NOTIFICATION_ID = 1001;

    private LocationManager locationManager;
private Location ultimaUbicacion = null;
private float distanciaMetros = 0f;
private long horaInicio = 0L;
private SharedPreferences actividadStorage;
    @Override
    public void onCreate() {
        super.onCreate();
    horaInicio = System.currentTimeMillis();
actividadStorage = getSharedPreferences(
        "viarank_activity_tracking",
        MODE_PRIVATE
);
        crearCanalNotificacion();

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("ViaRank")
                .setContentText("ViaRank está registrando tu actividad")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        locationManager =
                (LocationManager) getSystemService(LOCATION_SERVICE);

        try {
            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    2000,
                    2,
                    this,
                    Looper.getMainLooper()
            );
        } catch (SecurityException e) {
            stopSelf();
        }
    }

    private void crearCanalNotificacion() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Registro de actividad",
                    NotificationManager.IMPORTANCE_LOW
            );

            NotificationManager manager =
                    getSystemService(NotificationManager.class);

            manager.createNotificationChannel(channel);
        }
    }

   @Override
public void onLocationChanged(Location location) {
    if (location.getAccuracy() > 100) {
        return;
    }

    if (ultimaUbicacion != null) {
        float metros =
                ultimaUbicacion.distanceTo(location);

        if (metros >= 2 && metros <= 100) {
            distanciaMetros += metros;
        }
    }

    ultimaUbicacion = location;
actividadStorage.edit()
        .putFloat("distanciaMetros", distanciaMetros)
        .putLong("horaInicio", horaInicio)
        .putLong("ultimaActualizacion", System.currentTimeMillis())
        .apply();
}

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }

        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}