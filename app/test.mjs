
import { \$ } from 'zx';
await \$\ssh -o StrictHostKeyChecking=no debian@100.78.81.89 'rm -f /tmp/staging-boot.pid && if [ -f /tmp/staging-boot.pid ]; then kill -9 \\\\\cat /tmp/staging-boot.pid\\\\\; fi'\;

