FROM alpine:3.19

RUN apk add --no-cache openssh bash curl procps bc sudo && \
    ssh-keygen -A && \
    adduser -D -s /bin/bash pi && \
    echo 'pi:raspberry' | chpasswd && \
    mkdir -p /run/sshd /home/pi/.ssh && \
    chown pi:pi /home/pi/.ssh && \
    chmod 700 /home/pi/.ssh && \
    echo 'pi ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/pi && \
    chmod 440 /etc/sudoers.d/pi

# Install OS-agnostic command wrappers (same script used on real devices)
COPY --chmod=755 scripts/install-command-wrappers.sh /tmp/install-command-wrappers.sh
RUN /tmp/install-command-wrappers.sh && rm /tmp/install-command-wrappers.sh

# sshd: allow password auth, disable root login
RUN printf '\nPasswordAuthentication yes\nPermitRootLogin no\nAllowUsers pi\n' \
    >> /etc/ssh/sshd_config

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D", "-e"]
