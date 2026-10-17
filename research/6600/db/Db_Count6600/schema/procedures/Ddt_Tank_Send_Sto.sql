-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_Send_Sto (modified 2012-04-21T07:53:25.153)

CREATE  PROCEDURE [dbo].[Ddt_Tank_Send_Sto]  
 @SendId int, 
 @Sender nvarchar(50), 
 @ReceiverID nvarchar(50), 
 @Receiver nvarchar(50), 
 @Title varchar(50), 
 @Content varchar(200), 
 @Static int, 
 @SendDate DateTime, 
 @SendResult varchar(500),  
 @op varchar(50), 
 @ouototal varchar(50)='' output AS
if( @op='Insert') 
   begin 
     INSERT INTO Db_Count.dbo.Ddt_Send(SendId, Sender, ReceiverID, Receiver, Title, Content, Static, SendDate, SendResult) 
     VALUES(@SendId, @Sender, @ReceiverID, @Receiver, @Title, @Content, @Static, @SendDate, @SendResult)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end 
 if( @op!='Insert')
   begin 
     UPDATE Db_Count.dbo.Ddt_Send Set SendId=@SendId, Sender=@Sender, ReceiverID=@ReceiverID, Receiver=@Receiver, Title=@Title, Content=@Content, Static=@Static, SendDate=@SendDate, SendResult=@SendResult WHERE (id =@op)
     set @ouototal=@op   	
   end

GO
