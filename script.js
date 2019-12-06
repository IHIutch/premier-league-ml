/**
 * Get the car data reduced to just the variables we are interested
 * and cleaned of missing data.
 */
async function getData() {
  const carsDataReq = await fetch(
    "https://storage.googleapis.com/tfjs-tutorials/carsData.json"
  );
  const carsData = await carsDataReq.json();
  const cleaned = carsData
    .map(car => ({
      mpg: car.Miles_per_Gallon,
      horsepower: car.Horsepower
    }))
    .filter(car => car.mpg != null && car.horsepower != null);

  return cleaned;
}
