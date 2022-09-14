import "./styles.css";
import EscPosEncoder from "@manhnd/esc-pos-encoder";
import { Bluetooth, BluetoothRemoteGATTCharacteristic } from "./webbluetooth";

interface Column {
  width: number;
  align: "left" | "right" | "center";
  verticalAlign?: "top" | "bottom";
  marginLeft?: number;
  marginRight?: number;
}

const MAX_DATA_SIZE = 125;

const InvoiceColumn: Column[] = [
  { width: 5, marginRight: 2, align: "left" },
  { width: 10, marginRight: 2, align: "center" },
  { width: 10, align: "right" }
];

const InvoiceColumnHeader = ["QTY", "Item", "Total"];

const getPrintDeviceList = async () => {
  const nvg = navigator as any;
  if (nvg && nvg.bluetooth) {
    return await (nvg.bluetooth as Bluetooth).requestDevice({
      filters: [
        {
          services: ["000018f0-0000-1000-8000-00805f9b34fb"]
        }
      ]
    });
  } else {
    throw new Error("Navigator / Bluetooth is not found!");
  }
};

const getData = () => {
  let invoiceEncoder = new EscPosEncoder();
  let basePrint = invoiceEncoder
    .align("center")
    .line("CODE STORE")
    .align("left")
    .line("https://codesandbox.io/")
    .line(`No Trx: 1234111`)
    .line(`Kasir   : Zeta`)
    .line(`Customer: Guest`)
    .line(`Tanggal   : ${new Date().toTimeString()}`)
    .line(`Jam       : ${new Date().getHours()}`)
    .line(`Sub total : ${Number(111111)}`)
    .line(`Service   : ${Number(1)}`)
    .line(`Tax       : ${Number(12)}`)
    .line(`TOTAL     : ${Number(1111111)}`)
    .newline();

  basePrint
    .table(InvoiceColumn, [
      InvoiceColumnHeader,
      ["1", "Green Tea", "11.000"],
      ["1", "White Tea", "13.000"],
      ["1", "Blue Tea", "12.000"]
    ])
    .newline();
  basePrint
    .newline()
    .line("Nomor Antrian")
    .line("1")
    .newline()
    .line("Untuk cek pesanan kamu, bisa melakukan scan disini");
  basePrint.qrcode("Guest", 1, 2, "q");

  basePrint.newline().line("Terima Kasih").newline();
  return basePrint.encode();
};
function writeStrToCharacteristic(
  characteristic: BluetoothRemoteGATTCharacteristic,
  str: Uint8Array
) {
  let buffer = new ArrayBuffer(str.length);
  let dataView = new DataView(buffer);
  for (var i = 0; i < str.length; i++) {
    dataView.setUint8(i, str.at(i)!);
  }
  return characteristic.writeValue(dataView);
}

export default function App() {
  const handlePrint = async () => {
    try {
      const deviceList = await getPrintDeviceList();
      const gatt = await deviceList?.gatt?.connect();
      if (gatt) {
        if (typeof gatt.getPrimaryService === "function") {
          const service = await gatt.getPrimaryService(
            "000018f0-0000-1000-8000-00805f9b34fb"
          );
          if (service) {
            const printData = getData();
            console.log("printData", printData);
            const characteristic = await service.getCharacteristic(
              "00002af1-0000-1000-8000-00805f9b34fb"
            );
            if (printData.length > MAX_DATA_SIZE) {
              let j = 0;
              for (var i = 0; i < printData.length; i += MAX_DATA_SIZE) {
                var subStr;
                if (i + MAX_DATA_SIZE <= printData.length) {
                  subStr = printData.slice(i, i + MAX_DATA_SIZE);
                } else {
                  subStr = printData.slice(i, printData.length);
                }
                setTimeout(
                  writeStrToCharacteristic,
                  250 * j,
                  characteristic,
                  subStr
                );
                j++;
              }
            } else {
              await characteristic.writeValue(printData);
            }
          } else {
            console.log("service not found!");
          }
        } else {
          console.log("gatt.getPrimaryService not found!");
        }
      } else {
        console.log("GATT Device not found!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <button onClick={handlePrint}>PRINT</button>
    </div>
  );
}
