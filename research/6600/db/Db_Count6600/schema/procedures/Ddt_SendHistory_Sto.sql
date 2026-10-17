-- SQL_STORED_PROCEDURE dbo.Ddt_SendHistory_Sto (modified 2012-04-21T07:53:24.997)




--创建人:危超云
--创建时间:2008-12-16
--说明:记录赠总物品的历史记录
CREATE  PROCEDURE  [dbo].[Ddt_SendHistory_Sto]
 
 @SenderID varchar(50), 
 @Sender varchar(50), 
 @ReceiverID varchar(50), 
 @Receiver varchar(50), 
 @Title varchar(50), 
 @Content varchar(200), 
 @GoodId varchar(50), 
 @GoodNumber int, 
 @Static int, 
 @GoodName varchar(50), 
 @TemplateID int, 
 @ValidDate int, 
 @Gold int, 
 @Money int, 
 @StrengthenLevel int, 
 @AttackCompose int, 
 @DefendCompose int, 
 @AgilityCompose int, 
 @LuckCompose int,  
 @SendResult varchar(500),
 @IsBind bit,
 @op varchar(50), 
 @ouototal varchar(50)='' output AS  
 if( @op='Insert') 
   begin 
     INSERT INTO Db_Tank.Dbo.Ddt_SendHistory(SenderID, Sender, ReceiverID, Receiver, Title, Content, GoodId, GoodNumber, Static, GoodName, TemplateID, ValidDate, Gold, Money, StrengthenLevel, AttackCompose, DefendCompose, AgilityCompose, LuckCompose, SendResult,IsBind) 
     VALUES(@SenderID, @Sender, @ReceiverID, @Receiver, @Title, @Content, @GoodId, @GoodNumber, @Static, @GoodName, @TemplateID, @ValidDate, @Gold, @Money, @StrengthenLevel, @AttackCompose, @DefendCompose, @AgilityCompose, @LuckCompose, @SendResult,@IsBind)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end 
  
 if( @op!='Insert')
   begin 
     UPDATE Db_Tank.Dbo.Ddt_SendHistory Set SenderID=@SenderID, Sender=@Sender, ReceiverID=@ReceiverID, Receiver=@Receiver, Title=@Title, Content=@Content, GoodId=@GoodId, GoodNumber=@GoodNumber, Static=@Static, GoodName=@GoodName, TemplateID=@TemplateID, ValidDate=@ValidDate, Gold=@Gold, Money=@Money, StrengthenLevel=@StrengthenLevel, AttackCompose=@AttackCompose, DefendCompose=@DefendCompose, AgilityCompose=@AgilityCompose, LuckCompose=@LuckCompose , SendResult= @SendResult,IsBind=@IsBind WHERE (id =@op)
     set @ouototal=@op   	
   end
 



GO
