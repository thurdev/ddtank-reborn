-- SQL_STORED_PROCEDURE dbo.Sp_Count_OpHistory (modified 2012-04-21T07:53:25.200)


CREATE  PROCEDURE  [dbo].[Sp_Count_OpHistory]  
 
 @ApplicationName nvarchar(256), 
 @OpDateTime DateTime, 
 @OpData int, 
 @ModuleName nvarchar(512), 
 @OpActive nvarchar(100), 
 @OpUser nvarchar(100), 
 @IPAddress nvarchar(50),  
 @op varchar(50), 
 @ouototal varchar(50)='' output AS  

 
 if( @op='Insert') 
   begin 
     INSERT INTO Count_OpHistory(ApplicationId, OpDateTime, OpData, ModuleName, OpActive, OpUser, IPAddress) 
     VALUES(1, @OpDateTime, @OpData, @ModuleName, @OpActive, @OpUser, @IPAddress)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end 
  
 


GO
