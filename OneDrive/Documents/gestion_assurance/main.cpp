#include "gestion_assurance.h"

#include <QApplication>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    gestion_assurance w;
    w.show();
    return a.exec();
}
