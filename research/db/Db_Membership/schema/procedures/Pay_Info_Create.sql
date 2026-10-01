-- SQL_STORED_PROCEDURE dbo.Pay_Info_Create (modified 2012-04-21T07:54:31.047)
CREATE  PROCEDURE Pay_Info_Create  
 
 @OrderId varchar(20), 
 @OrderNumbers int, 
 @OrderMoney numeric(18,2), 
 @PayUserId varchar(50), 
 @EnterIp varchar(50), 
 @BuyInfo varchar(200), 
 @IsPass int, 
 @UserId varchar(50), 
 @PayWay varchar(20),  
 @op varchar(50), 
 @ouototal varchar(50)='' output AS  
 if( @op='Insert') 
   begin 
     INSERT INTO Pay_Info(OrderId, OrderNumbers, OrderMoney, PayUserId, EnterIp, EnterDate, BuyInfo, IsPass, UserId,  PayWay) 
     VALUES(@OrderId, @OrderNumbers, @OrderMoney, @PayUserId, @EnterIp, Getdate(), @BuyInfo, @IsPass, @UserId,  @PayWay)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end 
  
 if( @op!='Insert')
   begin 
     UPDATE Pay_Info Set OrderId=@OrderId, OrderNumbers=@OrderNumbers, OrderMoney=@OrderMoney, PayUserId=@PayUserId, EnterIp=@EnterIp,  BuyInfo=@BuyInfo, IsPass=@IsPass, UserId=@UserId, LastDateTime=Getdate(), PayWay=@PayWay WHERE (id =@op)
     set @ouototal=@op   	
   end
GO
