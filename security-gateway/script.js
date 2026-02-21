import http from "k6/http";
import { check, sleep } from "k6";

export default function () {

    for (let i = 0; i < 10; i++) {

        const res = http.post(
            "http://localhost:3000/auth/login",
            JSON.stringify({ username: "wrong" }),
            { headers: { "Content-Type": "application/json" } }
        );

        check(res, {
            "status is valid": (r) =>
                r.status === 401 ||
                r.status === 429 ||
                r.status === 403
        });

        console.log(`Request ${i + 1} → Status: ${res.status}`);

        sleep(1); // wait 1 sec between attempts
    }
}
