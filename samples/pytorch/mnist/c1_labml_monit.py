import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import torch.utils.data
from torchvision import datasets, transforms

from labml import lab, tracker, experiment, monit, logger


class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 20, 5, 1)
        self.conv2 = nn.Conv2d(20, 50, 5, 1)
        self.fc1 = nn.Linear(4 * 4 * 50, 500)
        self.fc2 = nn.Linear(500, 10)

    def forward(self, x):
        x = F.relu(self.conv1(x))
        x = F.max_pool2d(x, 2, 2)
        x = F.relu(self.conv2(x))
        x = F.max_pool2d(x, 2, 2)
        x = x.view(-1, 4 * 4 * 50)
        x = F.relu(self.fc1(x))
        return self.fc2(x)


def train(model, optimizer, train_loader, device, train_log_interval):
    """This is the training code"""

    model.train()
    for batch_idx, (data, target) in monit.enum("Train", train_loader):
        data, target = data.to(device), target.to(device)

        optimizer.zero_grad()
        output = model(data)
        loss = F.cross_entropy(output, target)
        loss.backward()
        optimizer.step()

        # **✨ Increment the global step**
        tracker.add_global_step()
        # **✨ Store stats in the tracker**
        tracker.save({'loss.train': loss})

        #
        if batch_idx % train_log_interval == 0:
            # **✨ Save added stats**
            tracker.save()


def validate(model, valid_loader, device):
    model.eval()
    valid_loss = 0
    correct = 0
    with torch.no_grad():
        for data, target in monit.iterate("valid", valid_loader):
            data, target = data.to(device), target.to(device)

            output = model(data)
            valid_loss += F.cross_entropy(output, target,
                                          reduction='sum').item()
            pred = output.argmax(dim=1, keepdim=True)
            correct += pred.eq(target.view_as(pred)).sum().item()

    valid_loss /= len(valid_loader.dataset)
    valid_accuracy = 100. * correct / len(valid_loader.dataset)

    # **Save stats**
    tracker.save({'loss.valid': valid_loss, 'accuracy.valid': valid_accuracy})


def main():
    # Configurations
    configs = {
        'epochs': 10,
        'train_batch_size': 64,
        'valid_batch_size': 100,
        'use_cuda': True,
        'seed': 5,
        'train_log_interval': 10,
        'learning_rate': 0.01,
    }

    is_cuda = configs['use_cuda'] and torch.cuda.is_available()
    if not is_cuda:
        device = torch.device("cpu")
    else:
        device = torch.device(f"cuda:0")

    data_transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])

    train_loader = torch.utils.data.DataLoader(
        datasets.MNIST(str(lab.get_data_path()),
                       train=True,
                       download=True,
                       transform=data_transform),
        batch_size=configs['train_batch_size'], shuffle=True)

    valid_loader = torch.utils.data.DataLoader(
        datasets.MNIST(str(lab.get_data_path()),
                       train=False,
                       download=True,
                       transform=data_transform),
        batch_size=configs['valid_batch_size'], shuffle=False)

    model = Net().to(device)
    optimizer = optim.Adam(model.parameters(), lr=configs['learning_rate'])

    torch.manual_seed(configs['seed'])

    # ✨ Create the experiment
    experiment.create(name='mnist_labml_monit')

    # ✨ Save configurations
    experiment.configs(configs)

    # ✨ Start and monitor the experiment
    with experiment.start():
        for _ in monit.loop(range(1, configs['epochs'] + 1)):
            train(model, optimizer, train_loader, device, configs['train_log_interval'])
            validate(model, valid_loader, device)
            logger.log()


if __name__ == '__main__':
    main()
