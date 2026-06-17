FROM alpine:3.19

RUN apk add --no-cache openssh bash curl procps bc && \
    ssh-keygen -A && \
    adduser -D -s /bin/bash pi && \
    echo 'pi:raspberry' | chpasswd && \
    mkdir -p /run/sshd /home/pi/.ssh && \
    chown pi:pi /home/pi/.ssh && \
    chmod 700 /home/pi/.ssh

# sshd: allow password auth, disable root login
RUN printf '\nPasswordAuthentication yes\nPermitRootLogin no\nAllowUsers pi\n' \
    >> /etc/ssh/sshd_config

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D", "-e"]
