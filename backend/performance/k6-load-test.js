import http from 'k6/http';
import { sleep } from 'k6';

export default function () {
    // Minimal K6 test stub
    console.log("K6 load test executed successfully.");
    sleep(1);
}
