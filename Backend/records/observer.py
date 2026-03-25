""" 
This file will implement the observer design pattern that we learned in our lectures 

To do this we need to make sure to notify all dependant objects and then update them accordingly. 
Changes in the state of one object are reported to these dependent objects. 

In our program, when a spray record's status changes, like from a draft to submitted, we need to 
automatically create an audit log entry without our view code knowing about this. 
By doing this the code is then decoupled and maintainable. 

We have to make sure we maintain conssitency between the related objects. So when a status is changed, the log must be updated 
We have to make sure the dependent objects are up to date with this state change. 

Ill try to highlight a list of what is participating in this: 
    -Subject (interface) 
        will maintain a list of its observers 
        Provides a interface for dealing with observers 
    
    -Observer (interface) 
        Will define an interface for update method for objects 
        these need to be notified of changes in the subject 
    
    -SprayRecord Subjuect (this is a concrete subject?) 
        Send a notification to observers when state change 
    
    -AuditLog Observer (concrete observer?)
        Will write to the sudit log database on update 
    
    -Logging Observer (concrete observer?)
        Will write to a log file on update 

Will attempt to do this with a push strategy where the subject will pass info to all observers as an arguement of update()
If we need more help with the observer pattern and python I got most of the info and tutorials needed from 
Refactoring Guru and geeksforgeeks.
"""

import logging 
from abc import ABC, abstractmethod

logger = logging.getLogger("observer")

#Observer Interface 
#Need to make sure every concrete observer implements the update method
#This will be the interface that the subject calls when notifying 
class Observer(ABC):
    """ 
    This is the abstract class for the observer interface 
    The ABC just means abstract base class, from what i understand we are unable 
    to create observer objects directly?. SO we need a subclass that implements the update()
    """
    @abstractmethod
    def update(self, data: dict):
        """ 
        This is called by the subject when its state changes. 
        It needs to be overwritten by every concrete observer. And to make sure of this
        we can add the decorator above the definition. If i forget to implement it once then 
        I should get some sort of error message. 

        The data : dict is a dictionary that willcontain information about the change
        This is the push strategy that sends all relevant data to the observer as an arguement 
        """
        pass

##########################################################################################################################

#Subject Interface
#This needs to maintain a list of observers. 
#Also provide an interface for attaching and detaching objects 
#I want to do this like the lecture diagram so need to implement register, deregister and notify 
class Subject (ABC): 
    def __init__(self): 
        """ 
        This should initialize the subject with an empty observer list
        _observer_list will store all the observer objects that are registered. 
        By adding a _ infront this should make it private, and only this class is able to access it. 
        """ 
        self._observer_list =[]
    
    def register (self, observer : Observer): 
        """ 
        Add an observer to the list 
        After this, the observer will be notified wheneber the subject's state changes.
        The arguement is an observer
        Need to also make sure there are no duplicates in the list. 
        """ 
        if observer not in self._observer_list: 
            self._observer_list.append(observer)
            logger.info(
                "Observer registered: %s",
                observer.__class__.__name__, #grabs class and name they were created from, thanks python!
            )
    
    def unregister (self, observer : Observer):
        """ 
        This removes an observer from the list 
        A removed observer will not recieve notifications when the state changes. 
        Also need to make sure there are no duplicates. 
        """ 
        if observer in self._observer_list: 
            self._observer_list.remove(observer)
            logger.info(
                "Observer unregistered: %s", 
                observer.__class__.__name__,
            )
    
    def notify (self, data: dict): 
        """ 
        This will notify all the registered observers by calling their update()
        I want it to loop through the observer list and call update(data) on each 
        observer
        """ 
        logger.info(
            "Notifying %d observer(s)", len(self._observer_list)
        )
        for observer in self._observer_list:
            try:
                observer.update(data)
            except Exception as e:
                #Log any error but keep notifying all the other observers 
                #One broken observer should not make everything crash 
                logger.error(
                    "Observer %s failed: %s",
                    observer.__class__.__name__,
                    str(e),
                )

##########################################################################################################################

#Spray Record Subject 
#Will store the state of intrest to observers. 
#Will send a notification to its observers when its state changes
class SprayRecordSubject(Subject):
    """ 
    This is a concrete subject that will track spray record state changes. 

    When a record is updated, or created, or chages status, the view will call set state on this subject 
    That triggers notify which then calls update for the observers.
    """ 
    def __init__(self):
        #Initialize with an empty state and empty list 
        #Call the parents __init__ to set up the list 
        super().__init__()

        #the _subject_sstate should store the most recent data 
        self._subject_state = {}
    
    def set_state(self, data: dict): 
        """ 
        Update the subjects state and notify all observers 

        The views will call this whenever something important happens to a spray 
        record 

        The dictionary in this case could be somehting like 

            {
                event : status changed 
                record id : abc 
                actor email : something@something.com 
                from status : draft 
                to status : submitted 
            }
        """ 
        #Make sure to save the state 
        self._subject_state = data 
        logger.info(
            "Subject state changed %s",
            data.get("event", "unknown"),
        )

        #Then notify all observers about the change 
        self.notify(data)

    def get_state(self): 
        """ 
        Return the current subject state 
        This will return a dictionary of the most recent data 
        """ 
        return self._subject_state

##########################################################################################################################

#Audit Log Observer - Concrete Observer
class AuditLogObserver(Observer): 
    """ 
    This will write to the audit log database 

    When the spray subject notifies this observer when a state change ahppens, 
    it will create a new row in the table recording who did what and when 

    This is the main portion of our observer pattern that keeps audit logging decoupled.

    The views can just call subject.set_state() and this should handle the rest of it. 
    """ 

    def __inti__(self):
        """ 
        Initialize the observers state 
        """
        self._observer_state ={}
    
    def update(self, data: dict):
        """ 
        This is called by the subject when a records state changes 
        And creates an entry in the database 
        """ 

        #Have to import here to stop circular importing 
        from records.models import AuditLogObserver

        #Update the internal state of the observer 
        self._observer_state = data 

        #Then get the event type from the data 
        event = data.get("event", "")

        #Then need the elif structure to handle everything differently
        if event == "record_created":
            AuditLog.objects.create(
                record_id=data['record_id'],
                actor_email=data["actor_email"],
                action="CREATED",
                to_status="DRAFT",
            )
            logger.info(
                "Audit log: Record %s created by %s",
                data['record_id'], data['actor_email'],
            )

        elif event == "status_changed":
            AuditLog.objects.create(
                record_id=data['record_id'],
                actor_email=data["actor_email"],
                action="STATUS_CHANGE",
                from_status=data.get('from_status'),
                to_status=data.get('to_status'),
            )
            logger.info(
                "Audit log: Record %s changed %s -> %s",
                data['record_id'], 
                data.get('from_status'),
                data.get('to_status'),
                data['actor_email'],
            )
        
        elif event == "record_updated":
            AuditLog.objects.create(
                record_id=data['record_id'],
                actor_email=data["actor_email"],
                action="UPDATED",
            )
            logger.info(
                "Audit log: Record %s updated by %s",
                data['record_id'], data['actor_email'],
            )

##########################################################################################################################

#Logging Observer - Concrete Observer 
class LoggingObserver(Observer):
    """ 
    This will write all events to a log file using Djangos logging system.

    Mainly for debugging and monitoring purposes!
    """ 
    def __init__(self):
        """ 
        initialize the observers state
        """
        self._observer_state = {}
    
    def update(self, data: dict): 
        """ 
        Called by the subject for all events and writes to a log file 
        """
        self._observer_state = data
        event = data.get('event', 'unknown')
        logger.info(
            "[LoggingObserver] Event: %s | Data: %s",
            event, str(data),
        )

##########################################################################################################################

#Global instance 
#We create one isntance of the subject that the entire app shares.
#We register all observers to it at the start in apps.py, then all the views use it
spray_record_subject = SprayRecordSubject()
